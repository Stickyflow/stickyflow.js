import { beforeEach, describe, expect, it } from 'vitest';
import type { PropertyChangeEvent } from '../src/runtime/interaction/events';
import { bindEditing } from '../src/runtime/interaction/index';
import { blockPrefixOf } from '../src/runtime/interaction/propertyDrag/target';
import { createFakeViewer } from './fakeViewer';

const SVG_NS = 'http://www.w3.org/2000/svg';

if (typeof globalThis.CSS === 'undefined') {
  globalThis.CSS = { escape: (value: string) => value.replace(/[^\w-]/g, '\\$&') } as typeof globalThis.CSS;
}

function add(svg: SVGSVGElement, tag: string, attrs: Record<string, string>): SVGGraphicsElement {
  const element = document.createElementNS(SVG_NS, tag) as SVGGraphicsElement;
  for (const [name, value] of Object.entries(attrs)) {
    element.setAttribute(name, value);
  }
  Object.defineProperty(element, 'getBBox', {
    value: () => ({ x: 40, y: 100, width: 300, height: 0 }),
    configurable: true,
  });
  svg.appendChild(element);
  return element;
}

function buildChart(svg: SVGSVGElement) {
  svg.setAttribute('viewBox', '0 0 400 300');
  Object.defineProperty(svg, 'getScreenCTM', { value: () => null, configurable: true });

  add(svg, 'rect', {
    'data-sf-role': 'chart',
    'data-sf-id': 'c',
    'data-sf-primary': 'true',
    'data-sf-value-scale': '40,200,0,100',
  });
  const line = add(svg, 'path', {
    'data-sf-role': 'chart',
    'data-sf-id': 'c',
    'data-sf-prop': 'Rule[target].at',
    'data-sf-prop-kind': 'value',
    d: 'M 40 130 L 340 130',
  });
  const label = add(svg, 'text', {
    'data-sf-role': 'chart',
    'data-sf-id': 'c',
    'data-sf-prop': 'Rule[target].text',
  });
  const bar = add(svg, 'rect', {
    'data-sf-role': 'chart',
    'data-sf-id': 'c',
    'data-sf-series': 'online',
    'data-sf-value-index': '0',
    'data-sf-prop': 'Series[online].values[0]',
    x: '100',
    y: '140',
    width: '40',
    height: '100',
  });
  return { line, label, bar };
}

function pointer(type: string, clientY: number): PointerEvent {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: 200, clientY });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event as PointerEvent;
}

const readout = () => document.querySelector('[data-sf-value-readout]');

describe('dragging the rule line', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('reports the rule path, not a move or a value change', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    const { line } = buildChart(svg);

    const seen: PropertyChangeEvent[] = [];
    const others: string[] = [];
    interaction.on('propertyChange', event => seen.push(event));
    interaction.on('moveChange', () => others.push('moveChange'));
    interaction.on('chartValueChange', () => others.push('chartValueChange'));

    line.dispatchEvent(pointer('pointerdown', 130));
    svg.dispatchEvent(pointer('pointermove', 90));
    svg.dispatchEvent(pointer('pointerup', 90));

    expect(others).toEqual([]);
    expect(seen).toHaveLength(1);
    expect(seen[0].path).toBe('Rule[target].at');
    expect(typeof seen[0].value).toBe('number');
  });

  it('carries the rule label along while dragging and cleans up after', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    const { line, label } = buildChart(svg);

    line.dispatchEvent(pointer('pointerdown', 130));
    svg.dispatchEvent(pointer('pointermove', 90));
    expect(line.getAttribute('transform')).toMatch(/translate/);
    expect(label.getAttribute('transform')).toMatch(/translate/);

    svg.dispatchEvent(pointer('pointerup', 90));
    expect(line.getAttribute('transform')).toBeNull();
    expect(label.getAttribute('transform')).toBeNull();
  });

  it('shows the live value and removes it on release', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    const { line } = buildChart(svg);

    line.dispatchEvent(pointer('pointerdown', 130));
    expect(readout()).toBeNull();
    svg.dispatchEvent(pointer('pointermove', 90));
    expect(readout()).not.toBeNull();
    svg.dispatchEvent(pointer('pointerup', 90));
    expect(readout()).toBeNull();
  });

  it('does not move the rule when the bar next to it is dragged', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer, { properties: {} });
    const { line, bar } = buildChart(svg);

    bar.dispatchEvent(pointer('pointerdown', 200));
    svg.dispatchEvent(pointer('pointermove', 150));
    expect(line.getAttribute('transform')).toBeNull();
  });

  it('stays silent on a plain click', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: {} });
    const { line } = buildChart(svg);

    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    line.dispatchEvent(pointer('pointerdown', 130));
    svg.dispatchEvent(pointer('pointerup', 130));
    expect(seen).toEqual([]);
  });

  it('is not bound when the host did not ask for property editing', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer);
    const { line } = buildChart(svg);

    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    line.dispatchEvent(pointer('pointerdown', 130));
    svg.dispatchEvent(pointer('pointermove', 90));
    svg.dispatchEvent(pointer('pointerup', 90));
    expect(seen).toEqual([]);
  });

  it('honours the editable whitelist', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer, { properties: { editable: { 'Series[*].label': true } } });
    const { line } = buildChart(svg);

    const seen: PropertyChangeEvent[] = [];
    interaction.on('propertyChange', event => seen.push(event));

    line.dispatchEvent(pointer('pointerdown', 130));
    svg.dispatchEvent(pointer('pointermove', 90));
    svg.dispatchEvent(pointer('pointerup', 90));
    expect(seen).toEqual([]);
  });
});

describe('blockPrefixOf', () => {
  it('groups the parts of one rule together', () => {
    expect(blockPrefixOf('Rule[target].at')).toBe('Rule[target].');
    expect(blockPrefixOf('Rule[target].text')).toBe('Rule[target].');
  });

  it('keeps a top-level property to itself', () => {
    expect(blockPrefixOf('text')).toBe('');
  });
});
