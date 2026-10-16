import { alphaOf, hexOf, hexToRgb } from './color';
import { clampPosition, gradientCss } from './gradientValue';
import {
  activeAlpha,
  activeHex,
  commitStopOrder,
  MIN_STOPS,
  type Picker,
  removeStop,
  selectStop,
} from './popoverActions';
import { el, showRatio } from './popoverDom';
import { CHANNELS, type StopRow } from './popoverView';

function createStopRow(picker: Picker, index: number): StopRow {
  const { view, lockStops, state } = picker;
  const root = el('div', 'sf-cp-stop', view.stopList);
  const swatch = el('span', 'sf-cp-stop-swatch', root);
  const hex = el('span', 'sf-cp-stop-hex', root);
  const position = el('input', 'sf-cp-stop-pos', root);
  position.type = 'number';
  position.min = '0';
  position.max = '100';
  position.disabled = lockStops;
  const remove = el('button', 'sf-cp-stop-remove', root);
  remove.type = 'button';
  remove.textContent = '×';
  remove.title = 'Remove stop';
  remove.hidden = lockStops;

  root.addEventListener('mousedown', () => selectStop(picker, index));
  position.addEventListener('input', () => {
    const value = Number(position.value);
    if (!Number.isFinite(value)) {
      return;
    }
    state.gradient.stops[index] = { ...state.gradient.stops[index], position: clampPosition(value) };
    renderPreview(picker);
  });
  position.addEventListener('change', () => commitStopOrder(picker));
  remove.addEventListener('click', event => {
    event.stopPropagation();
    removeStop(picker, index);
  });
  return { root, swatch, hex, position, remove };
}

function renderStops(picker: Picker): void {
  const { view, state } = picker;
  const rows = view.stopRows;
  while (rows.length > state.gradient.stops.length) {
    rows.pop()?.root.remove();
  }
  while (rows.length < state.gradient.stops.length) {
    rows.push(createStopRow(picker, rows.length));
  }
  state.gradient.stops.forEach((stop, index) => {
    const row = rows[index];
    row.root.setAttribute('aria-selected', String(index === state.selected));
    row.swatch.style.background = stop.color;
    const alpha = alphaOf(stop.color);
    row.hex.textContent = alpha < 1 ? `${hexOf(stop.color)} ${Math.round(alpha * 100)}%` : hexOf(stop.color);
    if (document.activeElement !== row.position) {
      row.position.value = String(Math.round(stop.position));
    }
    row.remove.disabled = state.gradient.stops.length <= MIN_STOPS;
  });
}

function renderPreview(picker: Picker): void {
  picker.view.preview.style.background = gradientCss(picker.state.gradient);
}

export function renderPicker(picker: Picker): void {
  const { view, state } = picker;
  view.solidTab.setAttribute('aria-selected', String(state.mode === 'solid'));
  view.gradientTab.setAttribute('aria-selected', String(state.mode === 'gradient'));
  view.section.hidden = state.mode !== 'gradient';

  const hex = activeHex(picker);
  const rgb = hexToRgb(hex);
  view.matrix.style.background = `hsl(${state.hsv.h}, 100%, 50%)`;
  view.matrixCursor.style.left = `${state.hsv.s * 100}%`;
  view.matrixCursor.style.top = `${(1 - state.hsv.v) * 100}%`;
  view.hueThumb.style.top = `${(state.hsv.h / 360) * 100}%`;

  for (const channel of CHANNELS) {
    view.channelRanges[channel].value = String(rgb[channel]);
    showRatio(view.channelRanges[channel]);
    if (document.activeElement !== view.channelNumbers[channel]) {
      view.channelNumbers[channel].value = String(rgb[channel]);
    }
  }
  const percent = Math.round(activeAlpha(picker) * 100);
  view.alphaRange.value = String(percent);
  showRatio(view.alphaRange);
  if (document.activeElement !== view.alphaNumber) {
    view.alphaNumber.value = String(percent);
  }
  const opaque = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  view.alphaRow.style.background = `linear-gradient(to right, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0), ${opaque}), conic-gradient(#c8c8c8 25%, #ffffff 0 50%, #c8c8c8 0 75%, #ffffff 0) 0 0 / 8px 8px`;
  if (document.activeElement !== view.hexInput) {
    view.hexInput.value = hex;
  }

  if (state.mode === 'gradient') {
    view.angleRange.value = String(Math.round(state.gradient.angle));
    showRatio(view.angleRange);
    if (document.activeElement !== view.angleNumber) {
      view.angleNumber.value = String(Math.round(state.gradient.angle));
    }
    renderPreview(picker);
    renderStops(picker);
  }
}
