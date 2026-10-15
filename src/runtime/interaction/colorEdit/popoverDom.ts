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

export function rangeField(parent: HTMLElement, min: number, max: number): HTMLInputElement {
  const input = el('input', 'sf-cp-range', parent);
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  return input;
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
