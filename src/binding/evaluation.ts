import { type ComponentValue, isBuiltInComponentType } from '../model/component';
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

function applyComponentValue(state: RuntimeState, binding: BoundProperty, value: ComponentValue): boolean {
  const id = binding.ownerPath[0];
  const element = state.elementState.get(id);
  if (element) {
    element.value = value;
    markDirty(state, id);
  }
  if (!isBuiltInComponentType(state.graph.elements.get(id)?.componentType)) {
    return true;
  }
  announce(state, binding.id, { kind: 'component', id, value: value as number });
  return false;
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
  const readsSelf = binding.dependencies.includes('self.id');
  if (binding.ownerKind === 'Shader' && readsSelf) {
    const owners = state.input.shapes.filter(shape => shape.shader?.name === binding.ownerPath[0]);
    for (const owner of owners) {
      const value = evaluate(binding.expr, {
        read: path => (path[0] === 'self' && path[1] === 'id' ? owner.id : readValue(state, path)),
      });
      const appliedId = `${binding.id}.${owner.id}`;
      const key = JSON.stringify(value);
      if (state.applied.get(appliedId) === key) {
        continue;
      }
      state.applied.set(appliedId, key);
      applyShader(state.input, binding, value, owner.id);
      announce(state, appliedId, {
        kind: 'shader',
        owners: [owner.id],
        parameters: { [binding.property]: value as number },
      });
    }
    return false;
  }
  const selfId = binding.ownerKind === 'Shader' ? undefined : binding.ownerPath[0];
  const value = evaluate(binding.expr, {
    read: path => (path[0] === 'self' && path[1] === 'id' && selfId ? selfId : readValue(state, path)),
  });
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
  if (binding.ownerKind === 'Component' && binding.property === 'value') {
    return applyComponentValue(state, binding, value as ComponentValue);
  }
  return true;
}

export function flush(state: RuntimeState): RenderResult | null {
  state.scheduled = false;
  let changed = state.renderNeeded;
  state.renderNeeded = false;
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
