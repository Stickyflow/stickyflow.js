import { type RenderResult, renderCanvas } from '../render';
import { APPLY, applyShader } from './applyValue';
import { evaluate } from './expression';
import { missingSource, type RuntimeState, readValue } from './runtimeState';
import type { LiveChange } from './runtimeTypes';
import type { BoundProperty } from './types';

function announce(state: RuntimeState, id: string, change: LiveChange): void {
  state.liveState.set(id, change);
  for (const listener of [...state.liveListeners]) {
    listener(change);
  }
}

function warnMissingSource(state: RuntimeState, binding: BoundProperty, missing: string): void {
  if (state.warned.has(missing)) {
    return;
  }
  state.warned.add(missing);
  state.diagnostics.push({
    severity: 'warning',
    code: 'source-not-registered',
    message: `DataSource '${missing}' has no registered source, so '${binding.property}' stays empty.`,
    line: binding.line,
    col: binding.col,
  });
}

function evaluateBinding(state: RuntimeState, binding: BoundProperty): boolean {
  const missing = missingSource(state, binding);
  if (missing) {
    warnMissingSource(state, binding, missing);
    return false;
  }
  const value = evaluate(binding.expr, { read: path => readValue(state, path) });
  const key = JSON.stringify(value);
  if (state.applied.get(binding.id) === key) {
    return false;
  }
  state.applied.set(binding.id, key);
  if (binding.ownerKind === 'Shader') {
    announce(state, binding.id, {
      kind: 'shader',
      owners: applyShader(state.input, binding, value),
      parameters: { [binding.property]: value as number },
    });
    return false;
  }
  APPLY[`${binding.ownerKind === 'Text' ? 'Shape' : binding.ownerKind}.${binding.property}`]?.(
    state.input,
    binding.ownerPath,
    value,
  );
  if (binding.ownerKind === 'Component') {
    announce(state, binding.id, { kind: 'component', id: binding.ownerPath[0], value: value as number });
    return false;
  }
  return true;
}

export function flush(state: RuntimeState): RenderResult | null {
  state.scheduled = false;
  let changed = false;
  for (const binding of state.dirty) {
    changed = evaluateBinding(state, binding) || changed;
  }
  state.dirty.clear();
  if (!changed) {
    return null;
  }
  const result = renderCanvas(state.input, { ...state.options.renderOptions, linkHitAreas: true });
  for (const listener of [...state.listeners]) {
    listener(result);
  }
  return result;
}

export function schedule(state: RuntimeState): void {
  if (!state.scheduled) {
    state.scheduled = true;
    queueMicrotask(() => flush(state));
  }
}

export function markDirty(state: RuntimeState, name: string): void {
  for (const [field, bindings] of state.graph.byField) {
    if (field.startsWith(`${name}.`)) {
      for (const binding of bindings) {
        state.dirty.add(binding);
      }
    }
  }
}
