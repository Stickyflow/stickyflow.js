import { type ComponentValue, getComponentDescriptor, isGenericComponent } from '../model/component';
import { sliderReach } from '../model/component/sliderReach';
import { findComponent, isComponentDisabled, writeComponentValue, writeComponentValueEnd } from './applyValue';
import type { MutableDataSource } from './dataSource';
import { markDirty, schedule } from './evaluation';
import { dispatch, setElementState } from './handlers';
import type { RuntimeState } from './runtimeState';
import { type BoundProperty, CHANGE_EVENT, type Row } from './types';

function descriptorOf(state: RuntimeState, id: string) {
  const info = state.graph.elements.get(id);
  return info?.kind === 'Component' ? getComponentDescriptor(info.componentType) : undefined;
}

function valueBinding(state: RuntimeState, id: string, property = 'value'): BoundProperty | undefined {
  return state.graph.bindings.find(
    binding => binding.ownerKind === 'Component' && binding.ownerPath[0] === id && binding.property === property,
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

// The second value of a component that holds two, such as the upper end of a range.
function changeValueEnd(state: RuntimeState, id: string, next: number): boolean {
  const component = findComponent(state.input, id);
  if (!component || !isGenericComponent(component) || component.properties.valueEnd === next || isComponentDisabled(state.input, id)) {
    return false;
  }
  const binding = valueBinding(state, id, 'valueEnd');
  if (binding && binding.operator !== '<->') {
    return false;
  }
  writeComponentValueEnd(state.input, id, next);
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

export function changeComponentValue(state: RuntimeState, id: string, next: ComponentValue, property: 'value' | 'valueEnd' = 'value'): boolean {
  if (property === 'valueEnd') {
    return typeof next === 'number' && changeValueEnd(state, id, next);
  }
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

const TAU = Math.PI * 2;
// Which thumb of a range a gesture holds: the one that was nearer where it began.
const grabbed = new WeakMap<RuntimeState, Map<string, 'start' | 'end'>>();
const within = (value: number): number => Math.min(1, Math.max(0, value));

// How far along its range a slider is when the pointer is at a fraction of its width and of its height.
function slideAlong(properties: Record<string, ComponentValue>, width: number, height: number, x: number, y: number): number {
  const vertical = properties.direction === 'vertical';
  const length = vertical ? height : width;
  const reach = sliderReach(properties.variant, vertical ? width : height);
  const position = vertical ? 1 - y : x;
  return length > reach * 2 ? within((position * length - reach) / (length - reach * 2)) : position;
}

// How far round its range a knob is when the pointer is at a fraction of its width and of its height.
function turnAlong(properties: Record<string, ComponentValue>, width: number, height: number, x: number, y: number): number {
  const start = (Number(properties.start ?? 225) * Math.PI) / 180;
  const sweep = (Number(properties.sweep ?? 270) * Math.PI) / 180;
  const gap = TAU - sweep;
  const angle = Math.atan2(-(y - 0.5) * height, (x - 0.5) * width);
  const shifted = start - angle + gap / 2;
  return within(((((shifted % TAU) + TAU) % TAU) - gap / 2) / sweep);
}

// A pointer in a slider, a knob or a row of options becomes the value of the component. It comes as fractions of the width and the height.
export function slideElement(state: RuntimeState, id: string, x: number, y = 0): void {
  const component = findComponent(state.input, id);
  if (!component || !isGenericComponent(component)) {
    return;
  }
  const kind = descriptorOf(state, id)?.interaction;
  const { properties } = component;
  if (kind === 'pick') {
    const count = String(properties.options ?? '')
      .split(',')
      .filter(option => option.trim()).length;
    if (count > 0) {
      changeComponentValue(state, id, Math.min(count - 1, Math.floor(x * count)));
    }
    return;
  }
  const along =
    kind === 'turn'
      ? turnAlong(properties, component.width, component.height, x, y)
      : slideAlong(properties, component.width, component.height, x, y);
  const min = Number(properties.min ?? 0);
  const max = Number(properties.max ?? 100);
  const step = Number(properties.step ?? 0);
  let value = min + along * (max - min);
  if (step > 0) {
    value = min + Math.round((value - min) / step) * step;
  }
  const taken = Number(Math.min(max, Math.max(min, value)).toFixed(6));
  if (kind !== 'range') {
    changeComponentValue(state, id, taken);
    return;
  }
  const low = Number(component.value);
  const high = Number(properties.valueEnd ?? max);
  const holds = grabbed.get(state) ?? new Map<string, 'start' | 'end'>();
  grabbed.set(state, holds);
  if (!holds.has(id)) {
    holds.set(id, taken >= high || (taken > low && taken - low > high - taken) ? 'end' : 'start');
  }
  // The thumbs do not pass each other.
  if (holds.get(id) === 'start') {
    changeComponentValue(state, id, Math.min(taken, high));
  } else {
    changeComponentValue(state, id, Math.max(taken, low), 'valueEnd');
  }
}

function reactToActivation(state: RuntimeState, id: string): void {
  const element = state.elementState.get(id);
  const descriptor = descriptorOf(state, id);
  if (element && descriptor?.interaction === 'toggle' && descriptor.value?.type === 'boolean') {
    changeComponentValue(state, id, element.value !== true);
  }
}

export function pressElement(state: RuntimeState, id: string): void {
  grabbed.get(state)?.delete(id);
  if (isComponentDisabled(state.input, id)) {
    return;
  }
  setElementState(state, id, { pressed: true });
  dispatch(state, id, 'onPress');
}

export function releaseElement(state: RuntimeState, id: string, tapped: boolean): void {
  grabbed.get(state)?.delete(id);
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
