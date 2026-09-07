import { beforeEach, describe, expect, it } from 'vitest';
import { bindEditing } from '../src/interaction/index';
import { applyCompositeScale } from '../src/interaction/resize/geometryPreview';
import { createFakeViewer } from './fakeViewer';

const SVG_NS = 'http://www.w3.org/2000/svg';

if (typeof globalThis.CSS === 'undefined') {
  globalThis.CSS = { escape: (value: string) => value.replace(/[^\w-]/g, '\\$&') } as typeof globalThis.CSS;
}

function node(svg: SVGSVGElement, tag: string, attrs: Record<string, string>): SVGGraphicsElement {
  const element = document.createElementNS(SVG_NS, tag) as SVGGraphicsElement;
  for (const [name, value] of Object.entries(attrs)) {
    element.setAttribute(name, value);
  }
  Object.defineProperty(element, 'getBBox', {
    value: () => ({ x: 0, y: 0, width: 400, height: 300 }),
    configurable: true,
  });
  svg.appendChild(element);
  return element;
}

function buildChart(svg: SVGSVGElement) {
  svg.setAttribute('viewBox', '0 0 400 300');
  Object.defineProperty(svg, 'getScreenCTM', { value: () => null, configurable: true });

  const chart = node(svg, 'rect', {
    'data-sf-role': 'chart',
    'data-sf-id': 'c',
    'data-sf-kind': 'bar',
    'data-sf-primary': 'true',
    'data-sf-value-scale': '40,200,0,100',
  });
  const bar = node(svg, 'path', {
    'data-sf-role': 'chart',
    'data-sf-id': 'c',
    'data-sf-series': 'online',
    'data-sf-value-index': '0',
    'data-sf-mark': 'bar',
    'data-sf-bar-radius': '2',
    d: 'M 100 140 H 140 V 240 H 100 Z',
  });
  Object.defineProperty(bar, 'getBBox', {
    value: () => ({ x: 100, y: 140, width: 40, height: 100 }),
    configurable: true,
  });
  return { chart, bar };
}

function pointer(type: string, clientX: number, clientY: number): PointerEvent {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event as PointerEvent;
}

describe('dragging a bar does not drag the chart', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('reports a value change, never a move', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer);
    const { bar } = buildChart(svg);

    const seen: string[] = [];
    interaction.on('moveChange', () => seen.push('moveChange'));
    interaction.on('chartValueChange', () => seen.push('chartValueChange'));

    bar.dispatchEvent(pointer('pointerdown', 120, 200));
    svg.dispatchEvent(pointer('pointermove', 120, 150));
    svg.dispatchEvent(pointer('pointerup', 120, 150));

    expect(seen).toEqual(['chartValueChange']);
  });

  it('redraws the bar as a rounded path live, mid-drag, not just its own attributes', () => {
    const { viewer, svg } = createFakeViewer();
    bindEditing(viewer);
    const { bar } = buildChart(svg);

    bar.dispatchEvent(pointer('pointerdown', 120, 200));
    svg.dispatchEvent(pointer('pointermove', 120, 150));

    const d = bar.getAttribute('d') ?? '';
    expect(d).toContain(' Q '); // still rounded - data-sf-bar-radius carried through the drag
    expect(bar).not.toHaveProperty('y'); // never reverts to rect-style attributes
  });

  it('still moves the chart when the drag starts on its background', () => {
    const { viewer, svg } = createFakeViewer();
    const interaction = bindEditing(viewer);
    const { chart } = buildChart(svg);

    const seen: string[] = [];
    interaction.on('moveChange', () => seen.push('moveChange'));
    interaction.on('chartValueChange', () => seen.push('chartValueChange'));

    chart.dispatchEvent(pointer('pointerdown', 20, 20));
    svg.dispatchEvent(pointer('pointermove', 60, 40));
    svg.dispatchEvent(pointer('pointerup', 60, 40));

    expect(seen).toEqual(['moveChange']);
  });
});

describe('the composite resize preview', () => {
  const bounds = { x: 0, y: 0, width: 400, height: 300 };
  const grown = { x: 0, y: 0, width: 600, height: 300 };

  function scenario() {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    const bar = node(svg, 'rect', { x: '10', y: '10', width: '20', height: '40' });
    const label = node(svg, 'text', { transform: 'rotate(-90 12 200)' });
    const nodes = [bar, label];
    return { bar, label, nodes, base: nodes.map(n => n.getAttribute('transform')) };
  }

  it('scales every node instead of stretching each one onto the full box', () => {
    const { bar, nodes, base } = scenario();
    applyCompositeScale(nodes, bounds, grown, base);

    expect(bar.getAttribute('transform')).toContain('scale(1.5 1)');
    expect(bar.getAttribute('width')).toBe('20');
    expect(bar.getAttribute('x')).toBe('10');
  });

  it('carries text along rather than leaving it behind', () => {
    const { label, nodes, base } = scenario();
    applyCompositeScale(nodes, bounds, grown, base);
    expect(label.getAttribute('transform')).toContain('scale(1.5 1)');
  });

  it('keeps a rotation the node already had', () => {
    const { label, nodes, base } = scenario();
    applyCompositeScale(nodes, bounds, grown, base);
    expect(label.getAttribute('transform')).toContain('rotate(-90 12 200)');
    expect(label.getAttribute('transform')?.indexOf('scale')).toBeLessThan(
      label.getAttribute('transform')?.indexOf('rotate') ?? -1,
    );
  });
});
