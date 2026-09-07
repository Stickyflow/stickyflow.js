import { beforeEach, describe, expect, it } from 'vitest';
import { bindChartValueDrag } from '../src/interaction/chartValueDrag';
import { Emitter } from '../src/interaction/events';
import { createFakeViewer } from './fakeViewer';

const SVG_NS = 'http://www.w3.org/2000/svg';

if (typeof globalThis.CSS === 'undefined') {
  globalThis.CSS = { escape: (value: string) => value.replace(/[^\w-]/g, '\\$&') } as typeof globalThis.CSS;
}

function buildLineChart(svg: SVGSVGElement) {
  svg.setAttribute('viewBox', '0 0 400 300');
  Object.defineProperty(svg, 'getScreenCTM', { value: () => null, configurable: true });

  const chart = document.createElementNS(SVG_NS, 'rect') as SVGGraphicsElement;
  chart.setAttribute('data-sf-role', 'chart');
  chart.setAttribute('data-sf-id', 'c');
  chart.setAttribute('data-sf-primary', 'true');
  chart.setAttribute('data-sf-value-scale', '40,200,0,100');
  svg.appendChild(chart);

  const line = document.createElementNS(SVG_NS, 'path') as SVGGraphicsElement;
  // A real render() with an idPrefix (every SflDiagram instance sets one, to
  // avoid id collisions between multiple diagrams on one page) bakes that
  // prefix into `id` - so the lookup this test guards must never key off the
  // raw id string, only the data-sf-* attributes, which stay stable.
  line.setAttribute('id', 'sf-r1-chart-line-c-a');
  line.setAttribute('data-sf-role', 'chart');
  line.setAttribute('data-sf-id', 'c');
  line.setAttribute('data-sf-series', 'a');
  line.setAttribute('d', 'M 100 150 L 150 120 L 200 180');
  svg.appendChild(line);

  const points = [
    { x: 100, y: 150 },
    { x: 150, y: 120 },
    { x: 200, y: 180 },
  ].map((p, index) => {
    const point = document.createElementNS(SVG_NS, 'ellipse') as SVGGraphicsElement;
    point.setAttribute('data-sf-role', 'chart');
    point.setAttribute('data-sf-id', 'c');
    point.setAttribute('data-sf-series', 'a');
    point.setAttribute('data-sf-value-index', String(index));
    point.setAttribute('cx', String(p.x));
    point.setAttribute('cy', String(p.y));
    svg.appendChild(point);
    return point;
  });

  return { line, points };
}

function pointer(type: string, clientY: number): PointerEvent {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: 150, clientY });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event as PointerEvent;
}

describe('dragging a line point keeps the connecting line attached', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('updates the path live, mid-drag, before the pointer is released', () => {
    const { viewer, svg } = createFakeViewer();
    bindChartValueDrag(viewer, new Emitter());
    const { line, points } = buildLineChart(svg);

    points[1].dispatchEvent(pointer('pointerdown', 120));
    svg.dispatchEvent(pointer('pointermove', 80));

    const d = line.getAttribute('d') ?? '';
    expect(d).toContain(`150 ${points[1].getAttribute('cy')}`);
    expect(points[1].getAttribute('cy')).not.toBe('120');
  });

  it('keeps the untouched points exactly where they were', () => {
    const { viewer, svg } = createFakeViewer();
    bindChartValueDrag(viewer, new Emitter());
    const { line, points } = buildLineChart(svg);

    points[1].dispatchEvent(pointer('pointerdown', 120));
    svg.dispatchEvent(pointer('pointermove', 80));

    const d = line.getAttribute('d') ?? '';
    expect(d).toContain('100 150');
    expect(d).toContain('200 180');
  });

  it('leaves scatter-style points (no connecting path) untouched', () => {
    const { viewer, svg } = createFakeViewer();
    bindChartValueDrag(viewer, new Emitter());
    const { line, points } = buildLineChart(svg);
    line.remove();

    points[1].dispatchEvent(pointer('pointerdown', 120));
    expect(() => svg.dispatchEvent(pointer('pointermove', 80))).not.toThrow();
  });
});
