import { type ComponentValue, getComponentDescriptor } from '../model/component';
import { isComponentDisabled, writeComponentValue } from './applyValue';
import type { MutableDataSource } from './dataSource';
import { markDirty, schedule } from './evaluation';
import { dispatch, setElementState } from './handlers';
import type { RuntimeState } from './runtimeState';
import { type BoundProperty, CHANGE_EVENT, type Row } from './types';

function descriptorOf(state: RuntimeState, id: string) {
  const info = state.graph.elements.get(id);
  return info?.kind === 'Component' ? getComponentDescriptor(info.componentType) : undefined;
}

function valueBinding(state: RuntimeState, id: string): BoundProperty | undefined {
  return state.graph.bindings.find(
    binding => binding.ownerKind === 'Component' && binding.ownerPath[0] === id && binding.property === 'value',
  );
}

function writeBack(state: RuntimeState, binding: BoundProperty, value: ComponentValue): void {
  const target = binding.expr.kind === 'ref' ? binding.expr.path : undefined;
  const source = target ? state.sources.get(target[0]) : undefined;
  if (!target || !source || !('set' in source)) {
    return;
  }
  const row = source.get() as Row;
  if (row[target[1]] !== value) {
    (source as MutableDataSource).set({ ...row, [target[1]]: value });
  }
}

export function changeComponentValue(state: RuntimeState, id: string, next: ComponentValue): boolean {
  const spec = descriptorOf(state, id)?.value;
  const element = state.elementState.get(id);
  if (!spec?.writable || !element || typeof next !== spec.type || element.value === next) {
    return false;
  }
  if (isComponentDisabled(state.input, id)) {
    return false;
  }
  const binding = valueBinding(state, id);
  if (binding && binding.operator !== '<->') {
    return false;
  }
  element.value = next;
  writeComponentValue(state.input, id, next);
  state.renderNeeded = true;
  if (binding) {
    state.applied.set(binding.id, JSON.stringify(next));
    writeBack(state, binding, next);
  }
  markDirty(state, id);
  dispatch(state, id, CHANGE_EVENT);
  schedule(state);
  return true;
}

function reactToActivation(state: RuntimeState, id: string): void {
  const element = state.elementState.get(id);
  const descriptor = descriptorOf(state, id);
  if (element && descriptor?.interaction === 'toggle' && descriptor.value?.type === 'boolean') {
    changeComponentValue(state, id, element.value !== true);
  }
}

export function pressElement(state: RuntimeState, id: string): void {
  if (isComponentDisabled(state.input, id)) {
    return;
  }
  setElementState(state, id, { pressed: true });
  dispatch(state, id, 'onPress');
}

export function releaseElement(state: RuntimeState, id: string, tapped: boolean): void {
  setElementState(state, id, { pressed: false });
  if (isComponentDisabled(state.input, id)) {
    return;
  }
  if (tapped) {
    reactToActivation(state, id);
  }
  dispatch(state, id, 'onRelease');
  if (tapped) {
    dispatch(state, id, 'onTap');
  }
}

export function activateElement(state: RuntimeState, id: string): void {
  if (isComponentDisabled(state.input, id)) {
    return;
  }
  reactToActivation(state, id);
  dispatch(state, id, 'onTap');
}
