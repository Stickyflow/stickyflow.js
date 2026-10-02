import { beforeEach, describe, expect, it } from 'vitest';
import { radarSeriesPath, radarVertexPoint } from '../src/renderScene/charts/primitives/radarShape';
import { Emitter } from '../src/runtime/interaction/events';
import { bindRadarVertexDrag } from '../src/runtime/interaction/radarVertexDrag/binding';
import { createFakeViewer } from './fakeViewer';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FRAME = { centerX: 200, centerY: 200, radius: 100, min: 0, max: 10, count: 4, curved: false };

if (typeof globalThis.CSS === 'undefined') {
  globalThis.CSS = { escape: (value: string) => value.replace(/[^\w-]/g, '\\$&') } as typeof globalThis.CSS;
}

class FakeDOMPoint {
  constructor(
    public x: number,
    public y: number,
  ) {}
  matrixTransform(): FakeDOMPoint {
    return this;
  }
}
if (typeof globalThis.DOMPoint === 'undefined') {
  globalThis.DOMPoint = FakeDOMPoint as unknown as typeof DOMPoint;
}
const identityCtm = { inverse: () => identityCtm } as unknown as DOMMatrix;

const SERIES: Record<string, number[]> = { a: [3, 4, 2, 5], b: [6, 1, 7, 2] };

function buildRadar(svg: SVGSVGElement) {
  svg.setAttribute('viewBox', '0 0 400 400');
  Object.defineProperty(svg, 'getScreenCTM', { value: () => identityCtm, configurable: true });

  const chart = document.createElementNS(SVG_NS, 'rect') as SVGGraphicsElement;
  chart.setAttribute('data-sf-role', 'chart');
  chart.setAttribute('data-sf-id', 'c1');
  chart.setAttribute('data-sf-primary', 'true');
  chart.setAttribute(
    'data-sf-radar-geometry',
    `${FRAME.centerX},${FRAME.centerY},${FRAME.radius},${FRAME.min},${FRAME.max},${FRAME.count},0`,
  );
  svg.appendChild(chart);

  const shapes: Record<string, SVGGraphicsElement[]> = {};
  const vertices: Record<string, SVGGraphicsElement[]> = {};

  for (const [seriesId, values] of Object.entries(SERIES)) {
    const points = values.map((value, index) => radarVertexPoint(FRAME, index, value));

    shapes[seriesId] = ['fill', 'series'].map(role => {
      const path = document.createElementNS(SVG_NS, 'path') as SVGGraphicsElement;
      path.setAttribute('data-sf-role', 'chart');
      path.setAttribute('data-sf-id', 'c1');
      path.setAttribute('data-sf-series', seriesId);
      path.setAttribute('d', radarSeriesPath(points, false));
      path.dataset.role = role;
      svg.appendChild(path);
      return path;
    });

    vertices[seriesId] = values.map((_, index) => {
      const dot = document.createElementNS(SVG_NS, 'ellipse') as SVGGraphicsElement;
      dot.setAttribute('data-sf-role', 'chart');
      dot.setAttribute('data-sf-id', 'c1');
      dot.setAttribute('data-sf-series', seriesId);
      dot.setAttribute('data-sf-value-index', String(index));
      dot.setAttribute('data-sf-mark', 'radar-vertex');
      dot.setAttribute('cx', String(points[index].x));
      dot.setAttribute('cy', String(points[index].y));
      svg.appendChild(dot);
      return dot;
    });
  }

  return { shapes, vertices };
}

function roundedPath(d: string, decimals = 6): string {
  return d.replace(/-?\d+\.?\d*/g, token => Number(token).toFixed(decimals));
}

function pointerAtValue(type: string, index: number, value: number): PointerEvent {
  const point = radarVertexPoint(FRAME, index, value);
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: point.x, clientY: point.y });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event as PointerEvent;
}

function setup() {
  const { viewer, svg } = createFakeViewer();
  const emitter = new Emitter();
  const events: Array<{ series: string; index: number; value: number }> = [];
  emitter.on('chartValueChange', event => events.push(event));
  bindRadarVertexDrag(viewer, emitter);
  const built = buildRadar(svg);
  return { svg, events, ...built };
}

describe('dragging a radar vertex moves it along its own spoke only', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('emits one chartValueChange for the dragged vertex, with the projected value', () => {
    const { svg, events, vertices } = setup();

    vertices.a[1].dispatchEvent(pointerAtValue('pointerdown', 1, 4));
    svg.dispatchEvent(pointerAtValue('pointermove', 1, 8));
    svg.dispatchEvent(pointerAtValue('pointerup', 1, 8));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ series: 'a', index: 1 });
    expect(events[0].value).toBeCloseTo(8, 6);
  });

  it('redraws that series polygon live and leaves every other series untouched', () => {
    const { svg, events, shapes, vertices } = setup();
    const bBefore = shapes.b.map(shape => shape.getAttribute('d'));

    vertices.a[0].dispatchEvent(pointerAtValue('pointerdown', 0, 3));
    svg.dispatchEvent(pointerAtValue('pointermove', 0, 9));

    const expected = roundedPath(
      radarSeriesPath(
        [9, 4, 2, 5].map((value, index) => radarVertexPoint(FRAME, index, value)),
        false,
      ),
    );
    for (const shape of shapes.a) {
      expect(roundedPath(shape.getAttribute('d') ?? '')).toBe(expected);
    }
    expect(shapes.b.map(shape => shape.getAttribute('d'))).toEqual(bBefore);
    expect(events).toHaveLength(0);
  });

  it('clamps a drag past the axis max to the max, not beyond the outer ring', () => {
    const { svg, events, vertices } = setup();

    vertices.a[2].dispatchEvent(pointerAtValue('pointerdown', 2, 2));
    svg.dispatchEvent(pointerAtValue('pointermove', 2, 999));
    svg.dispatchEvent(pointerAtValue('pointerup', 2, 999));

    expect(events[0].value).toBe(10);
    const clamped = radarVertexPoint(FRAME, 2, 10);
    expect(Number(vertices.a[2].getAttribute('cx'))).toBeCloseTo(clamped.x, 6);
    expect(Number(vertices.a[2].getAttribute('cy'))).toBeCloseTo(clamped.y, 6);
  });

  it('projects an off-spoke pointer back onto the spoke', () => {
    const { svg, vertices } = setup();
    const onSpoke = radarVertexPoint(FRAME, 0, 6);
    const offSpoke = new MouseEvent('pointermove', {
      bubbles: true,
      button: 0,
      clientX: onSpoke.x + 40,
      clientY: onSpoke.y,
    });
    Object.defineProperty(offSpoke, 'pointerId', { value: 1 });

    vertices.a[0].dispatchEvent(pointerAtValue('pointerdown', 0, 3));
    svg.dispatchEvent(offSpoke as PointerEvent);
    svg.dispatchEvent(offSpoke as PointerEvent);

    expect(Number(vertices.a[0].getAttribute('cx'))).toBeCloseTo(FRAME.centerX, 6);
  });

  it('shows a live value readout during the drag and clears it on release', () => {
    const { svg, vertices } = setup();

    vertices.a[1].dispatchEvent(pointerAtValue('pointerdown', 1, 4));
    expect(svg.querySelector('[data-sf-value-readout]')).toBeNull();

    svg.dispatchEvent(pointerAtValue('pointermove', 1, 7.5));
    const readout = svg.querySelector('[data-sf-value-readout]');
    expect(readout).not.toBeNull();
    expect(readout?.querySelector('text')?.textContent).toBe('7.5');

    svg.dispatchEvent(pointerAtValue('pointerup', 1, 7.5));
    expect(svg.querySelector('[data-sf-value-readout]')).toBeNull();
  });

  it('does nothing on a plain click with no movement', () => {
    const { svg, events, vertices } = setup();

    vertices.a[0].dispatchEvent(pointerAtValue('pointerdown', 0, 3));
    svg.dispatchEvent(pointerAtValue('pointerup', 0, 3));

    expect(events).toHaveLength(0);
    expect(svg.querySelector('[data-sf-value-readout]')).toBeNull();
  });

  it('ignores a pointerdown that is not on a vertex', () => {
    const { svg, events } = setup();

    svg.dispatchEvent(pointerAtValue('pointerdown', 0, 5));
    svg.dispatchEvent(pointerAtValue('pointermove', 0, 9));
    svg.dispatchEvent(pointerAtValue('pointerup', 0, 9));

    expect(events).toHaveLength(0);
  });
});
