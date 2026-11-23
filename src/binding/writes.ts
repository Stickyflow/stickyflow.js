import { type BindingGraph, listed } from './graph';
import type { RuntimeState } from './runtimeState';
import type { BindingDiagnostic, Row } from './types';

function warnOnce(state: RuntimeState, name: string, code: string, message: string, line: number, col: number): void {
  const key = `write:${name}`;
  if (state.warned.has(key)) {
    return;
  }
  state.warned.add(key);
  state.diagnostics.push({ severity: 'warning', code, message, line, col });
}

// Every place where a document writes a field of a source: an assignment in a handler, or a control bound both ways.
export function sourceWrites(graph: BindingGraph): Array<{ source: string; field: string; line: number; col: number }> {
  const writes = graph.handlers.flatMap(handler =>
    handler.assignments.map(({ source, field, line, col }) => ({ source, field, line, col })),
  );
  for (const binding of graph.bindings) {
    const target = binding.operator === '<->' && binding.expr.kind === 'ref' ? binding.expr.path : undefined;
    if (target?.[1] !== undefined) {
      writes.push({ source: target[0], field: target[1], line: binding.line, col: binding.col });
    }
  }
  return writes;
}

// Every place where the document writes a field of a source that the host does not let it write: one error each.
export function hostWriteProblems(graph: BindingGraph, name: string, allowed: readonly string[]): BindingDiagnostic[] {
  return sourceWrites(graph)
    .filter(write => write.source === name && !allowed.includes(write.field))
    .map(({ field, line, col }) => ({
      severity: 'error' as const,
      code: 'write-not-allowed',
      message: `'${name}.${field}' is written by the document, but the host does not let it be written (it allows ${listed(allowed)}).`,
      line,
      col,
    }));
}

// Found when the source is registered. The writes themselves are left out when they come.
export function checkHostWritable(state: RuntimeState, name: string, allowed: readonly string[]): void {
  state.diagnostics.push(...hostWriteProblems(state.graph, name, allowed));
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
