import { el, labelledRow, numberField, rangeField, tabButton } from './popoverDom';
import type { ColorPickerTheme } from './theme';

export const CHANNELS = ['r', 'g', 'b'] as const;

export type Channel = (typeof CHANNELS)[number];

const GAP_BELOW_ANCHOR = 6;
const VIEWPORT_MARGIN = 8;

export interface Anchor {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StopRow {
  root: HTMLDivElement;
  swatch: HTMLSpanElement;
  hex: HTMLSpanElement;
  position: HTMLInputElement;
  remove: HTMLButtonElement;
}

export interface PickerView {
  root: HTMLDivElement;
  solidTab: HTMLButtonElement;
  gradientTab: HTMLButtonElement;
  matrix: HTMLDivElement;
  matrixCursor: HTMLDivElement;
  hue: HTMLDivElement;
  hueThumb: HTMLDivElement;
  channelRanges: Record<Channel, HTMLInputElement>;
  channelNumbers: Record<Channel, HTMLInputElement>;
  hexInput: HTMLInputElement;
  section: HTMLDivElement;
  preview: HTMLDivElement;
  angleRange: HTMLInputElement;
  angleNumber: HTMLInputElement;
  addStop: HTMLButtonElement;
  stopList: HTMLDivElement;
  stopRows: StopRow[];
  resetButton?: HTMLButtonElement;
}

export interface ViewOptions {
  anchor: Anchor;
  theme?: ColorPickerTheme;
  allowGradient: boolean;
  lockStops: boolean;
  withReset: boolean;
}

export function buildPickerView(options: ViewOptions): PickerView {
  const { anchor, allowGradient, lockStops } = options;
  const root = el('div', 'sf-cp');
  root.dataset.sfTheme = options.theme ?? 'auto';
  root.style.left = `${anchor.left}px`;
  root.style.top = `${anchor.top + anchor.height + GAP_BELOW_ANCHOR}px`;

  const tabs = el('div', 'sf-cp-tabs', root);
  tabs.setAttribute('role', 'tablist');
  tabs.hidden = !allowGradient;
  const solidTab = tabButton('Solid', tabs);
  const gradientTab = tabButton('Gradient', tabs);

  const area = el('div', 'sf-cp-area', root);
  const matrix = el('div', 'sf-cp-matrix', area);
  el('div', 'sf-cp-matrix-white', matrix);
  el('div', 'sf-cp-matrix-black', matrix);
  const matrixCursor = el('div', 'sf-cp-matrix-cursor', matrix);
  const hue = el('div', 'sf-cp-hue', area);
  const hueThumb = el('div', 'sf-cp-hue-thumb', hue);

  const rows = el('div', 'sf-cp-rows', root);
  const channelRanges = {} as Record<Channel, HTMLInputElement>;
  const channelNumbers = {} as Record<Channel, HTMLInputElement>;
  for (const channel of CHANNELS) {
    const row = labelledRow(rows, channel.toUpperCase());
    channelRanges[channel] = rangeField(row, 0, 255);
    channelNumbers[channel] = numberField(row, 0, 255);
  }
  const hexRow = labelledRow(rows, 'Hex');
  const hexInput = el('input', 'sf-cp-text', hexRow);
  hexInput.type = 'text';
  hexInput.spellcheck = false;

  const section = el('div', 'sf-cp-section', root);
  const preview = el('div', 'sf-cp-preview', section);
  const angleRow = labelledRow(section, 'Angle');
  angleRow.hidden = lockStops;
  const angleRange = rangeField(angleRow, 0, 360);
  const angleNumber = numberField(angleRow, 0, 360);
  const head = el('div', 'sf-cp-section-head', section);
  el('span', 'sf-cp-heading', head).textContent = 'Stops';
  const addStop = el('button', 'sf-cp-icon-btn', head);
  addStop.type = 'button';
  addStop.textContent = '+';
  addStop.title = 'Add stop';
  addStop.hidden = lockStops;
  const stopList = el('div', 'sf-cp-stops', section);

  let resetButton: HTMLButtonElement | undefined;
  if (options.withReset) {
    resetButton = el('button', 'sf-cp-reset', root);
    resetButton.type = 'button';
    resetButton.textContent = 'Use series color';
  }

  return {
    root,
    solidTab,
    gradientTab,
    matrix,
    matrixCursor,
    hue,
    hueThumb,
    channelRanges,
    channelNumbers,
    hexInput,
    section,
    preview,
    angleRange,
    angleNumber,
    addStop,
    stopList,
    stopRows: [],
    resetButton,
  };
}

export function clampIntoViewport(root: HTMLElement, anchor: Anchor): void {
  const rect = root.getBoundingClientRect();
  if (rect.height === 0 && rect.width === 0) {
    return;
  }
  const maxTop = window.innerHeight - rect.height - VIEWPORT_MARGIN;
  if (rect.top > maxTop) {
    const above = anchor.top - rect.height - GAP_BELOW_ANCHOR;
    root.style.top = `${Math.max(VIEWPORT_MARGIN, above)}px`;
  }
  const maxLeft = window.innerWidth - rect.width - VIEWPORT_MARGIN;
  if (rect.left > maxLeft) {
    root.style.left = `${Math.max(VIEWPORT_MARGIN, maxLeft)}px`;
  }
}
