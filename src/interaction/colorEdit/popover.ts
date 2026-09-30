import { type Hsv, hexToHsv, hexToRgb, hsvToHex, normalizeHex, rgbToHex, rgbToHsv } from './color';
import { clampPosition, type GradientValue, gradientCss, sortStops } from './gradientValue';
import { type ColorPickerTheme, ensureColorPickerStyles } from './theme';
import { darken, formatPickerValue, type PickerValue, toGradient, toSolid } from './value';

const GAP_BELOW_ANCHOR = 6;
const VIEWPORT_MARGIN = 8;
const MIN_STOPS = 2;
const MAX_STOPS = 8;
const CHANNELS = ['r', 'g', 'b'] as const;

type Channel = (typeof CHANNELS)[number];

export interface ColorPopoverOptions {
  seed: PickerValue;
  anchor: { left: number; top: number; width: number; height: number };
  theme?: ColorPickerTheme;
  allowGradient?: boolean;
  lockStops?: boolean;
  onCommit(value: string): void;
  onReset?(): void;
}

export interface ColorPopoverHandle {
  close(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  parent?.appendChild(node);
  return node;
}

function tabButton(label: string, parent: HTMLElement): HTMLButtonElement {
  const button = el('button', 'sf-cp-tab', parent);
  button.type = 'button';
  button.setAttribute('role', 'tab');
  button.textContent = label;
  return button;
}

function numberField(parent: HTMLElement, min: number, max: number): HTMLInputElement {
  const input = el('input', 'sf-cp-number', parent);
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  return input;
}

function rangeField(parent: HTMLElement, min: number, max: number): HTMLInputElement {
  const input = el('input', 'sf-cp-range', parent);
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  return input;
}

function labelledRow(parent: HTMLElement, text: string): HTMLDivElement {
  const row = el('div', 'sf-cp-row', parent);
  el('span', 'sf-cp-label', row).textContent = text;
  return row;
}

function ratio(value: number, size: number): number {
  return size > 0 ? Math.max(0, Math.min(1, value / size)) : 0;
}

function trackDrag(node: HTMLElement, onMove: (event: MouseEvent) => void, onEnd: () => void): () => void {
  const move = (event: MouseEvent) => onMove(event);
  const up = () => {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    onEnd();
  };
  const down = (event: MouseEvent) => {
    event.preventDefault();
    onMove(event);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };
  node.addEventListener('mousedown', down);
  return () => {
    node.removeEventListener('mousedown', down);
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
  };
}

interface StopRow {
  root: HTMLDivElement;
  swatch: HTMLSpanElement;
  hex: HTMLSpanElement;
  position: HTMLInputElement;
  remove: HTMLButtonElement;
}

export function openColorPopover(options: ColorPopoverOptions): ColorPopoverHandle {
  const { seed, anchor, onCommit, onReset } = options;
  const allowGradient = options.allowGradient ?? true;
  const lockStops = options.lockStops ?? false;
  ensureColorPickerStyles(document);

  let mode: PickerValue['mode'] = allowGradient ? seed.mode : 'solid';
  let solid = toSolid(seed);
  let gradient: GradientValue = toGradient(seed);
  let selected = 0;
  let hsv: Hsv = hexToHsv(solid);

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
  const stopRows: StopRow[] = [];

  if (onReset) {
    const resetButton = el('button', 'sf-cp-reset', root);
    resetButton.type = 'button';
    resetButton.textContent = 'Use series color';
    resetButton.addEventListener('click', () => {
      onReset();
      close();
    });
  }

  document.body.appendChild(root);
  clampIntoViewport();

  function clampIntoViewport(): void {
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

  function activeColor(): string {
    return mode === 'solid' ? solid : (gradient.stops[selected]?.color ?? solid);
  }

  function setActiveColor(hex: string): void {
    if (mode === 'solid') {
      solid = hex;
    } else if (gradient.stops[selected]) {
      gradient.stops[selected] = { ...gradient.stops[selected], color: hex };
    }
  }

  function current(): PickerValue {
    return mode === 'solid' ? { mode: 'solid', color: solid } : { mode: 'gradient', ...gradient };
  }

  function commit(): void {
    onCommit(formatPickerValue(current()));
  }

  function applyHsv(next: Hsv): void {
    hsv = next;
    setActiveColor(hsvToHex(next));
    render();
  }

  function applyHex(hex: string): void {
    hsv = hexToHsv(hex);
    setActiveColor(hex);
    render();
  }

  function renderStops(): void {
    while (stopRows.length > gradient.stops.length) {
      stopRows.pop()?.root.remove();
    }
    while (stopRows.length < gradient.stops.length) {
      const index = stopRows.length;
      const rowRoot = el('div', 'sf-cp-stop', stopList);
      const swatch = el('span', 'sf-cp-stop-swatch', rowRoot);
      const hex = el('span', 'sf-cp-stop-hex', rowRoot);
      const position = el('input', 'sf-cp-stop-pos', rowRoot);
      position.type = 'number';
      position.min = '0';
      position.max = '100';
      position.disabled = lockStops;
      const remove = el('button', 'sf-cp-stop-remove', rowRoot);
      remove.type = 'button';
      remove.textContent = '×';
      remove.title = 'Remove stop';
      remove.hidden = lockStops;

      rowRoot.addEventListener('mousedown', () => selectStop(index));
      position.addEventListener('input', () => {
        const value = Number(position.value);
        if (!Number.isFinite(value)) {
          return;
        }
        gradient.stops[index] = { ...gradient.stops[index], position: clampPosition(value) };
        renderPreview();
      });
      position.addEventListener('change', () => {
        gradient = { ...gradient, stops: sortStops(gradient.stops) };
        selected = Math.min(selected, gradient.stops.length - 1);
        render();
        commit();
      });
      remove.addEventListener('click', event => {
        event.stopPropagation();
        removeStop(index);
      });

      stopRows.push({ root: rowRoot, swatch, hex, position, remove });
    }

    gradient.stops.forEach((stop, index) => {
      const row = stopRows[index];
      row.root.setAttribute('aria-selected', String(index === selected));
      row.swatch.style.background = stop.color;
      row.hex.textContent = stop.color;
      if (document.activeElement !== row.position) {
        row.position.value = String(Math.round(stop.position));
      }
      row.remove.disabled = gradient.stops.length <= MIN_STOPS;
    });
  }

  function renderPreview(): void {
    preview.style.background = gradientCss(gradient);
  }

  function render(): void {
    solidTab.setAttribute('aria-selected', String(mode === 'solid'));
    gradientTab.setAttribute('aria-selected', String(mode === 'gradient'));
    section.hidden = mode !== 'gradient';

    const hex = activeColor();
    const rgb = hexToRgb(hex);
    matrix.style.background = `hsl(${hsv.h}, 100%, 50%)`;
    matrixCursor.style.left = `${hsv.s * 100}%`;
    matrixCursor.style.top = `${(1 - hsv.v) * 100}%`;
    hueThumb.style.top = `${(hsv.h / 360) * 100}%`;

    for (const channel of CHANNELS) {
      channelRanges[channel].value = String(rgb[channel]);
      if (document.activeElement !== channelNumbers[channel]) {
        channelNumbers[channel].value = String(rgb[channel]);
      }
    }
    if (document.activeElement !== hexInput) {
      hexInput.value = hex;
    }

    if (mode === 'gradient') {
      angleRange.value = String(Math.round(gradient.angle));
      if (document.activeElement !== angleNumber) {
        angleNumber.value = String(Math.round(gradient.angle));
      }
      renderPreview();
      renderStops();
    }
  }

  function selectStop(index: number): void {
    if (mode !== 'gradient' || index === selected || !gradient.stops[index]) {
      return;
    }
    selected = index;
    hsv = hexToHsv(gradient.stops[index].color);
    render();
  }

  function removeStop(index: number): void {
    if (gradient.stops.length <= MIN_STOPS) {
      return;
    }
    gradient = { ...gradient, stops: gradient.stops.filter((_stop, at) => at !== index) };
    selected = Math.min(selected, gradient.stops.length - 1);
    hsv = hexToHsv(activeColor());
    render();
    commit();
  }

  function appendStop(): void {
    if (gradient.stops.length >= MAX_STOPS) {
      return;
    }
    const sorted = sortStops(gradient.stops);
    const last = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];
    const inserted = {
      color: darken(last.color),
      position: clampPosition((last.position + (previous?.position ?? 0)) / 2),
    };
    gradient = { ...gradient, stops: sortStops([...gradient.stops, inserted]) };
    selected = gradient.stops.indexOf(inserted);
    hsv = hexToHsv(activeColor());
    render();
    commit();
  }

  function setMode(next: PickerValue['mode']): void {
    if (mode === next) {
      return;
    }
    const value = current();
    mode = next;
    if (next === 'gradient') {
      gradient = toGradient(value);
      selected = 0;
    } else {
      solid = toSolid(value);
    }
    hsv = hexToHsv(activeColor());
    render();
    commit();
  }

  const disposers: (() => void)[] = [];

  disposers.push(
    trackDrag(
      matrix,
      event => {
        const rect = matrix.getBoundingClientRect();
        applyHsv({
          h: hsv.h,
          s: ratio(event.clientX - rect.left, rect.width),
          v: 1 - ratio(event.clientY - rect.top, rect.height),
        });
      },
      commit,
    ),
  );

  disposers.push(
    trackDrag(
      hue,
      event => {
        const rect = hue.getBoundingClientRect();
        applyHsv({ ...hsv, h: ratio(event.clientY - rect.top, rect.height) * 360 });
      },
      commit,
    ),
  );

  solidTab.addEventListener('click', () => setMode('solid'));
  gradientTab.addEventListener('click', () => setMode('gradient'));
  addStop.addEventListener('click', appendStop);

  for (const channel of CHANNELS) {
    const fromChannel = (raw: string) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        return;
      }
      const next = { ...hexToRgb(activeColor()), [channel]: value };
      const nextHsv = rgbToHsv(next);
      hsv = nextHsv.s === 0 ? { ...nextHsv, h: hsv.h } : nextHsv;
      setActiveColor(rgbToHex(next));
      render();
    };
    channelRanges[channel].addEventListener('input', event => fromChannel((event.target as HTMLInputElement).value));
    channelRanges[channel].addEventListener('change', commit);
    channelNumbers[channel].addEventListener('input', event => fromChannel((event.target as HTMLInputElement).value));
    channelNumbers[channel].addEventListener('change', commit);
  }

  hexInput.addEventListener('input', () => {
    const hex = normalizeHex(hexInput.value);
    if (hex) {
      applyHex(hex);
    }
  });
  hexInput.addEventListener('change', () => {
    const hex = normalizeHex(hexInput.value);
    if (hex) {
      applyHex(hex);
      commit();
    } else {
      render();
    }
  });
  hexInput.addEventListener('blur', () => render());

  const applyAngle = (raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }
    gradient = { ...gradient, angle: Math.max(0, Math.min(360, value)) };
    render();
  };
  angleRange.addEventListener('input', event => applyAngle((event.target as HTMLInputElement).value));
  angleRange.addEventListener('change', commit);
  angleNumber.addEventListener('input', event => applyAngle((event.target as HTMLInputElement).value));
  angleNumber.addEventListener('change', commit);

  const onOutsideClick = (event: MouseEvent) => {
    if (!root.contains(event.target as Node)) {
      close();
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  function close(): void {
    window.clearTimeout(attach);
    document.removeEventListener('mousedown', onOutsideClick, true);
    document.removeEventListener('keydown', onKeyDown);
    for (const dispose of disposers) {
      dispose();
    }
    root.remove();
  }

  const attach = window.setTimeout(() => {
    document.addEventListener('mousedown', onOutsideClick, true);
    document.addEventListener('keydown', onKeyDown);
  }, 0);

  render();

  return { close };
}
