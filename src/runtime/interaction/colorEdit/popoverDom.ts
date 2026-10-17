export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  parent?.appendChild(node);
  return node;
}

export function tabButton(label: string, parent: HTMLElement): HTMLButtonElement {
  const button = el('button', 'sf-cp-tab', parent);
  button.type = 'button';
  button.setAttribute('role', 'tab');
  button.textContent = label;
  return button;
}

export function numberField(parent: HTMLElement, min: number, max: number): HTMLInputElement {
  const input = el('input', 'sf-cp-number', parent);
  input.type = 'number';
  input.min = String(min);
  input.max = String(max);
  return input;
}

export interface FluidField {
  row: HTMLDivElement;
  range: HTMLInputElement;
  number: HTMLInputElement;
}

export function fluidField(parent: HTMLElement, text: string, min: number, max: number): FluidField {
  const row = el('div', 'sf-cp-fluid', parent);
  el('span', 'sf-cp-fluid-fill', row);
  el('span', 'sf-cp-fluid-thumb', row);
  el('span', 'sf-cp-fluid-label', row).textContent = text;
  const range = el('input', 'sf-cp-fluid-range', row);
  range.type = 'range';
  range.min = String(min);
  range.max = String(max);
  const number = numberField(row, min, max);
  number.classList.add('sf-cp-fluid-number');
  return { row, range, number };
}

export function showRatio(range: HTMLInputElement): void {
  const span = Number(range.max) - Number(range.min);
  const ratio = span > 0 ? (Number(range.value) - Number(range.min)) / span : 0;
  range.parentElement?.style.setProperty('--sf-ratio', String(Math.max(0, Math.min(1, ratio))));
}

export function labelledRow(parent: HTMLElement, text: string): HTMLDivElement {
  const row = el('div', 'sf-cp-row', parent);
  el('span', 'sf-cp-label', row).textContent = text;
  return row;
}

export function ratio(value: number, size: number): number {
  return size > 0 ? Math.max(0, Math.min(1, value / size)) : 0;
}

export function trackDrag(node: HTMLElement, onMove: (event: MouseEvent) => void, onEnd: () => void): () => void {
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
