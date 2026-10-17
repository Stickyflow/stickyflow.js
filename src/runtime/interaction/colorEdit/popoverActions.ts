import { alphaOf, formatColorAlpha, type Hsv, hexOf, hexToHsv, hsvToHex } from './color';
import { clampPosition, type GradientValue, sortStops } from './gradientValue';
import type { PickerView } from './popoverView';
import { darken, formatPickerValue, type PickerValue, toAlpha, toGradient, toSolid } from './value';

const MIN_STOPS = 2;
const MAX_STOPS = 8;

export interface PickerState {
  mode: PickerValue['mode'];
  solid: string;
  alpha: number;
  gradient: GradientValue;
  selected: number;
  hsv: Hsv;
}

export interface Picker {
  view: PickerView;
  state: PickerState;
  lockStops: boolean;
  onCommit(value: string): void;
  render(): void;
}

export function activeColor(picker: Picker): string {
  const { state } = picker;
  return state.mode === 'solid' ? state.solid : (state.gradient.stops[state.selected]?.color ?? state.solid);
}

export function activeHex(picker: Picker): string {
  return hexOf(activeColor(picker));
}

export function activeAlpha(picker: Picker): number {
  return picker.state.mode === 'solid' ? picker.state.alpha : alphaOf(activeColor(picker));
}

function setActiveColorAlpha(picker: Picker, hex: string, alpha: number): void {
  const { state } = picker;
  if (state.mode === 'solid') {
    state.solid = hex;
    state.alpha = alpha;
  } else if (state.gradient.stops[state.selected]) {
    state.gradient.stops[state.selected] = {
      ...state.gradient.stops[state.selected],
      color: formatColorAlpha(hex, alpha),
    };
  }
}

export function setActiveColor(picker: Picker, hex: string): void {
  setActiveColorAlpha(picker, hex, activeAlpha(picker));
}

function currentValue(picker: Picker): PickerValue {
  const { state } = picker;
  return state.mode === 'solid'
    ? { mode: 'solid', color: state.solid, alpha: state.alpha }
    : { mode: 'gradient', ...state.gradient };
}

export function commit(picker: Picker): void {
  picker.onCommit(formatPickerValue(currentValue(picker)));
}

export function applyHsv(picker: Picker, next: Hsv): void {
  picker.state.hsv = next;
  setActiveColor(picker, hsvToHex(next));
  picker.render();
}

export function applyHex(picker: Picker, hex: string): void {
  picker.state.hsv = hexToHsv(hex);
  setActiveColor(picker, hex);
  picker.render();
}

export function applyAlpha(picker: Picker, raw: string): void {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return;
  }
  setActiveColorAlpha(picker, activeHex(picker), Math.max(0, Math.min(100, value)) / 100);
  picker.render();
}

export function applyAngle(picker: Picker, raw: string): void {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return;
  }
  picker.state.gradient = { ...picker.state.gradient, angle: Math.max(0, Math.min(360, value)) };
  picker.render();
}

export function selectStop(picker: Picker, index: number): void {
  const { state } = picker;
  if (state.mode !== 'gradient' || index === state.selected || !state.gradient.stops[index]) {
    return;
  }
  state.selected = index;
  state.hsv = hexToHsv(hexOf(state.gradient.stops[index].color));
  picker.render();
}

export function removeStop(picker: Picker, index: number): void {
  const { state } = picker;
  if (state.gradient.stops.length <= MIN_STOPS) {
    return;
  }
  state.gradient = { ...state.gradient, stops: state.gradient.stops.filter((_stop, at) => at !== index) };
  state.selected = Math.min(state.selected, state.gradient.stops.length - 1);
  state.hsv = hexToHsv(activeHex(picker));
  picker.render();
  commit(picker);
}

export function appendStop(picker: Picker): void {
  const { state } = picker;
  if (state.gradient.stops.length >= MAX_STOPS) {
    return;
  }
  const sorted = sortStops(state.gradient.stops);
  const last = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  const inserted = {
    color: formatColorAlpha(darken(hexOf(last.color)), alphaOf(last.color)),
    position: clampPosition((last.position + (previous?.position ?? 0)) / 2),
  };
  state.gradient = { ...state.gradient, stops: sortStops([...state.gradient.stops, inserted]) };
  state.selected = state.gradient.stops.indexOf(inserted);
  state.hsv = hexToHsv(activeHex(picker));
  picker.render();
  commit(picker);
}

export function setMode(picker: Picker, next: PickerValue['mode']): void {
  const { state } = picker;
  if (state.mode === next) {
    return;
  }
  const value = currentValue(picker);
  state.mode = next;
  if (next === 'gradient') {
    state.gradient = toGradient(value);
    state.selected = 0;
  } else {
    state.solid = toSolid(value);
    state.alpha = toAlpha(value);
  }
  state.hsv = hexToHsv(activeHex(picker));
  picker.render();
  commit(picker);
}

export function commitStopOrder(picker: Picker): void {
  const { state } = picker;
  state.gradient = { ...state.gradient, stops: sortStops(state.gradient.stops) };
  state.selected = Math.min(state.selected, state.gradient.stops.length - 1);
  picker.render();
  commit(picker);
}

export { MIN_STOPS };
