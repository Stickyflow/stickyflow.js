import { listed } from './graph';
import type { RuntimeState } from './runtimeState';
import type { Row } from './types';

function warnOnce(state: RuntimeState, name: string, code: string, message: string, line: number, col: number): void {
  const key = `write:${name}`;
  if (state.warned.has(key)) {
    return;
  }
  state.warned.add(key);
  state.diagnostics.push({ severity: 'warning', code, message, line, col });
}

// Every place where the document writes a field of a source that the host does not let it write: one error each, when the source is
// registered. The writes themselves are left out when they come.
export function checkHostWritable(state: RuntimeState, name: string, allowed: readonly string[]): void {
  const report = (field: string, line: number, col: number) =>
    state.diagnostics.push({
      severity: 'error',
      code: 'write-not-allowed',
      message: `'${name}.${field}' is written by the document, but the host does not let it be written (it allows ${listed(allowed)}).`,
      line,
      col,
    });
  for (const handler of state.graph.handlers) {
    for (const assignment of handler.assignments) {
      if (assignment.source === name && !allowed.includes(assignment.field)) {
        report(assignment.field, assignment.line, assignment.col);
      }
    }
  }
  for (const binding of state.graph.bindings) {
    const target = binding.operator === '<->' && binding.expr.kind === 'ref' ? binding.expr.path : undefined;
    if (target?.[0] === name && target[1] !== undefined && !allowed.includes(target[1])) {
      report(target[1], binding.line, binding.col);
    }
  }
}

// Writes fields of a record source the host registered: the fields a handler or a control changed, all of one handler in one
// call. A source with `write` is given only the fields that changed; one with only `set` the whole record with them in it.
export function writeFields(state: RuntimeState, name: string, fields: Readonly<Row>, line: number, col: number): void {
  const source = state.sources.get(name);
  if (!source) {
    warnOnce(
      state,
      name,
      'source-not-registered',
      `DataSource '${name}' has no registered source, so writing to it does nothing.`,
      line,
      col,
    );
    return;
  }
  const row = source.get();
  if (Array.isArray(row)) {
    return;
  }
  const allowed = source.writable;
  const changed = Object.fromEntries(
    Object.entries(fields).filter(
      ([field, value]) => (row as Row)[field] !== value && (!allowed || allowed.includes(field)),
    ),
  );
  if (Object.keys(changed).length === 0) {
    return;
  }
  if ('write' in source && typeof source.write === 'function') {
    source.write(changed);
  } else if ('set' in source && typeof source.set === 'function') {
    source.set({ ...(row as Row), ...changed });
  } else {
    warnOnce(
      state,
      name,
      'source-not-writable',
      `DataSource '${name}' was registered without write or set, so writing to it does nothing.`,
      line,
      col,
    );
  }
}
