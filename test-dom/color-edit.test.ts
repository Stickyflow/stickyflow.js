import { beforeEach, describe, expect, it } from 'vitest';
import type { PropertyChangeEvent } from '../src/interaction/events';
import { bindEditing } from '../src/interaction/index';
import { createFakeViewer } from './fakeViewer';

const SVG_NS = 'http://www.w3.org/2000/svg';

if (typeof globalThis.CSS === 'undefined') {
  globalThis.CSS = { escape: (value: string) => value.replace(/[^\w-]/g, '\\$&') } as typeof globalThis.CSS;
}

function swatch(svg: SVGSVGElement, fill: string | null): SVGGraphicsElement {
  const node = document.createElementNS(SVG_NS, 'rect') as SVGGraphicsElement;
  node.setAttribute('data-sf-role', 'chart');
  node.setAttribute('data-sf-id', 'c');
  node.setAttribute('data-sf-prop', 'Series[online].color');
  node.setAttribute('data-sf-prop-kind', 'color');
  if (fill) {
    node.setAttribute('fill', fill);
  }
  Object.defineProperty(node, 'getBBox', {
    value: () => ({ x: 300, y: 12, width: 10, height: 10 }),
    configurable: true,
  });
  Object.defineProperty(node, 'getScreenCTM', { value: () => null, configurable: true });
  svg.appendChild(node);
  return node;
}

function linearGradientDef(svg: SVGSVGElement, id: string, colors: string[]): void {
  const def = document.createElementNS(SVG_NS, 'linearGradient');
  def.setAttribute('id', id);
  def.setAttribute('x1', '0');
  def.setAttribute('y1', '0');
  def.setAttribute('x2', '100');
  def.setAttribute('y2', '0');
  colors.forEach((color, index) => {
    const stop = document.createElementNS(SVG_NS, 'stop');
    stop.setAttribute('offset', `${(index / (colors.length - 1)) * 100}%`);
    stop.setAttribute('stop-color', color);
    def.appendChild(stop);
  });
  svg.appendChild(def);
}

function bar(svg: SVGSVGElement, fill: string | null, colorProp: string): SVGGraphicsElement {
  const node = document.createElementNS(SVG_NS, 'path') as SVGGraphicsElement;
  node.setAttribute('data-sf-role', 'chart');
  node.setAttribute('data-sf-id', 'c');
  node.setAttribute('data-sf-prop', 'Series[online].values[1]');
  node.setAttribute('data-sf-prop-kind', 'value');
  node.setAttribute('data-sf-mark', 'bar');
  node.setAttribute('data-sf-color-prop', colorProp);
  if (fill) {
    node.setAttribute('fill', fill);
  }
  Object.defineProperty(node, 'getBBox', {
    value: () => ({ x: 60, y: 40, width: 20, height: 30 }),
    configurable: true,
  });
  Object.defineProperty(node, 'getScreenCTM', { value: () => null, configurable: true });
  svg.appendChild(node);
  return node;
}

const click = (node: Element) => {
  node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

const dblclick = (node: Element) => {
  node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
};

const popover = (): HTMLDivElement | null => document.querySelector<HTMLDivElement>('.sf-cp');
const hexField = (): HTMLInputElement | null => document.querySelector<HTMLInputElement>('.sf-cp-text');
const tab = (label: string): HTMLButtonElement | undefined =>
  [...document.querySelectorAll<HTMLButtonElement>('.sf-cp-tab')].find(button => button.textContent === label);
const stopHexes = (): string[] => [...document.querySelectorAll('.sf-cp-stop-hex')].map(node => node.textContent ?? '');

describe('clicking a legend swatch', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is not bound unless the host asks for property editing', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer);
    click(swatch(svg, '#6d5ef0'));
    expect(popover()).toBeNull();
  });

  it('opens a popover seeded with the series color, on the solid tab', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    click(swatch(svg, '#6d5ef0'));
    expect(hexField()?.value).toBe('#6d5ef0');
    expect(tab('Solid')?.getAttribute('aria-selected')).toBe('true');
  });

  it('falls back to a neutral solid seed for an unresolvable gradient fill, rather than black', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    click(swatch(svg, 'url(#chart-gradient-c-online)'));
    expect(hexField()?.value).not.toBe('#000000');
  });

  it('emits the property path and the picked color when the hex field is committed', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    click(swatch(svg, '#6d5ef0'));
    const hex = hexField();
    if (!hex) {
      throw new Error('no popover');
    }
    hex.value = '#db2777';
    hex.dispatchEvent(new Event('change'));

    expect(seen).toEqual([
      {
        owner: { role: 'chart', id: 'c', kind: undefined, label: undefined },
        path: 'Series[online].color',
        value: '#db2777',
      },
    ]);
  });

  it('stays open after a commit so more than one adjustment is possible', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    click(swatch(svg, '#6d5ef0'));
    const hex = hexField();
    hex?.dispatchEvent(new Event('change'));
    expect(popover()).not.toBeNull();
  });

  it('turns the solid color into a gradient when the gradient tab is picked', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    click(swatch(svg, '#6d5ef0'));
    tab('Gradient')?.click();

    expect(seen[0].value).toMatch(/^gradient\(90, #6d5ef0 0%, #[0-9a-f]{6} 100%\)$/);
    expect(popover()).not.toBeNull();
  });

  it('reopens on the gradient tab, seeded from every existing stop', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    linearGradientDef(svg, 'g1', ['#aaaaaa', '#cccccc', '#bbbbbb']);
    click(swatch(svg, 'url(#g1)'));

    expect(tab('Gradient')?.getAttribute('aria-selected')).toBe('true');
    expect(stopHexes()).toEqual(['#aaaaaa', '#cccccc', '#bbbbbb']);
  });

  it('recovers the angle the gradient was rendered with', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    linearGradientDef(svg, 'g2', ['#aaaaaa', '#bbbbbb']);
    click(swatch(svg, 'url(#g2)'));
    document.querySelector<HTMLButtonElement>('.sf-cp-section-head .sf-cp-icon-btn')?.click();

    expect(seen[0].value).toMatch(/^gradient\(0, /);
  });

  it('closes the previous popover when a second swatch is clicked', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    click(swatch(svg, '#6d5ef0'));
    const first = popover();
    click(swatch(svg, '#db2777'));
    expect(document.body.contains(first)).toBe(false);
    expect(popover()).not.toBeNull();
  });

  it('passes the host theme through to the popover', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: { colorPickerTheme: 'dark' } });
    click(swatch(svg, '#6d5ef0'));
    expect(popover()?.dataset.sfTheme).toBe('dark');
  });

  it('honours the editable whitelist', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: { editable: { 'Series[*].label': true } } });
    click(swatch(svg, '#6d5ef0'));
    expect(popover()).toBeNull();
  });

  it('ignores a click on a node without the color prop kind', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    const node = document.createElementNS(SVG_NS, 'rect');
    node.setAttribute('data-sf-role', 'chart');
    node.setAttribute('data-sf-id', 'c');
    node.setAttribute('data-sf-prop', 'Series[online].values[0]');
    node.setAttribute('data-sf-prop-kind', 'value');
    svg.appendChild(node);
    click(node);
    expect(popover()).toBeNull();
  });
});

describe('double-clicking a single bar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is ignored on a plain (single) click, so it never fights the value drag', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    click(bar(svg, '#6d5ef0', 'Series[online].colors[1]'));
    expect(popover()).toBeNull();
  });

  it('opens a popover addressing that one value, not the whole series', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    dblclick(bar(svg, '#6d5ef0', 'Series[online].colors[1]'));
    const hex = hexField();
    if (!hex) {
      throw new Error('no popover');
    }
    hex.value = '#db2777';
    hex.dispatchEvent(new Event('change'));

    expect(seen).toEqual([
      {
        owner: { role: 'chart', id: 'c', kind: undefined, label: undefined },
        path: 'Series[online].colors[1]',
        value: '#db2777',
      },
    ]);
  });

  it('honours the editable whitelist independently of the series-level color rule', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: { editable: { 'Series[*].color': true } } });
    dblclick(bar(svg, '#6d5ef0', 'Series[online].colors[1]'));
    expect(popover()).toBeNull();
  });

  it('ignores a bar with no color-prop attribute', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    const node = document.createElementNS(SVG_NS, 'path');
    node.setAttribute('data-sf-role', 'chart');
    node.setAttribute('data-sf-id', 'c');
    node.setAttribute('data-sf-prop', 'Series[online].values[0]');
    node.setAttribute('data-sf-prop-kind', 'value');
    node.setAttribute('data-sf-mark', 'bar');
    svg.appendChild(node);
    dblclick(node);
    expect(popover()).toBeNull();
  });
});

describe('color edit — lifecycle', () => {
  it('removes its listener on destroy', () => {
    const { viewer, log } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    interaction.destroy();

    const tally = (types: string[]) =>
      types.reduce<Record<string, number>>((counts, type) => {
        counts[type] = (counts[type] ?? 0) + 1;
        return counts;
      }, {});
    expect(tally(log.removed)).toEqual(tally(log.added));
  });

  it('closes an open popover when destroyed mid-session', () => {
    document.body.innerHTML = '';
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    click(swatch(svg, '#6d5ef0'));
    expect(popover()).not.toBeNull();
    interaction.destroy();
    expect(popover()).toBeNull();
  });

  it('stops opening popovers once destroyed', () => {
    document.body.innerHTML = '';
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} }).destroy();
    click(swatch(svg, '#6d5ef0'));
    expect(popover()).toBeNull();
  });
});
