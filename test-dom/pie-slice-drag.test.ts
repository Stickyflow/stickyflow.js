import { beforeEach, describe, expect, it } from 'vitest';
import { Emitter } from '../src/interaction/events';
import { bindPieSliceDrag } from '../src/interaction/pieSliceDrag/binding';
import { createPieSlicePath, pieArcPoint } from '../src/rendering/charts/primitives/pieShape';
import { createFakeViewer } from './fakeViewer';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CENTER = { centerX: 200, centerY: 200, outerRadius: 100, innerRadius: 0 };
const START = -Math.PI / 2;
const TWO_PI = Math.PI * 2;

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

interface SliceSpec {
  seriesId: string;
  start: number;
  end: number;
  value: number;
}

const TOTAL = 100;
const SHARES = [
  { seriesId: 'online', value: 58 },
  { seriesId: 'retail', value: 37 },
  { seriesId: 'other', value: 5 },
];

const SLICES: SliceSpec[] = SHARES.reduce<SliceSpec[]>((acc, share) => {
  const start = acc.length === 0 ? START : acc[acc.length - 1].end;
  acc.push({ ...share, start, end: start + (share.value / TOTAL) * TWO_PI });
  return acc;
}, []);

function buildPieChart(svg: SVGSVGElement) {
  svg.setAttribute('viewBox', '0 0 400 400');
  Object.defineProperty(svg, 'getScreenCTM', { value: () => identityCtm, configurable: true });

  const chart = document.createElementNS(SVG_NS, 'rect') as SVGGraphicsElement;
  chart.setAttribute('data-sf-role', 'chart');
  chart.setAttribute('data-sf-id', 'c1');
  chart.setAttribute('data-sf-primary', 'true');
  chart.setAttribute(
    'data-sf-pie-geometry',
    `${CENTER.centerX},${CENTER.centerY},${CENTER.outerRadius},${CENTER.innerRadius}`,
  );
  svg.appendChild(chart);

  const elements = SLICES.map(slice => {
    const path = document.createElementNS(SVG_NS, 'path') as SVGGraphicsElement;
    path.setAttribute('data-sf-role', 'chart');
    path.setAttribute('data-sf-id', 'c1');
    path.setAttribute('data-sf-mark', 'pie-slice');
    path.setAttribute('data-sf-series', slice.seriesId);
    path.setAttribute('data-sf-pie-start', String(slice.start));
    path.setAttribute('data-sf-pie-end', String(slice.end));
    path.setAttribute('data-sf-pie-value', String(slice.value));
    path.setAttribute('d', createPieSlicePath(CENTER, slice));
    svg.appendChild(path);

    const label = document.createElementNS(SVG_NS, 'text') as SVGTextElement;
    label.setAttribute('data-sf-role', 'chart');
    label.setAttribute('data-sf-id', 'c1');
    label.setAttribute('data-sf-series', slice.seriesId);
    const nameTspan = document.createElementNS(SVG_NS, 'tspan');
    nameTspan.textContent = slice.seriesId;
    const percentTspan = document.createElementNS(SVG_NS, 'tspan');
    percentTspan.textContent = `${Math.round((slice.value / TOTAL) * 100)}%`;
    label.appendChild(nameTspan);
    label.appendChild(percentTspan);
    svg.appendChild(label);

    return path;
  });

  return { chart, elements };
}

function roundedPath(d: string, decimals = 6): string {
  return d.replace(/-?\d+\.?\d*/g, token => Number(token).toFixed(decimals));
}

function pointerAt(type: string, angle: number, radius = CENTER.outerRadius / 2): PointerEvent {
  const point = pieArcPoint(CENTER, angle, radius);
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: point.x, clientY: point.y });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event as PointerEvent;
}

function setup() {
  const { viewer, svg } = createFakeViewer();
  const emitter = new Emitter();
  const events: Array<{ series: string; index: number; value: number }> = [];
  emitter.on('chartValueChange', event => events.push(event));
  bindPieSliceDrag(viewer, emitter);
  const { elements } = buildPieChart(svg);
  const [online, retail, other] = elements;
  return { svg, events, online, retail, other };
}

describe('dragging a pie slice edge redistributes only the two slices that share it', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('grabs the clicked slice own clockwise edge, wherever inside the slice the drag starts', () => {
    const { svg, events, online } = setup();

    online.dispatchEvent(pointerAt('pointerdown', SLICES[0].start + 0.05));
    svg.dispatchEvent(pointerAt('pointermove', START + TWO_PI * 0.3));
    svg.dispatchEvent(pointerAt('pointerup', START + TWO_PI * 0.3));

    expect(events.map(event => event.series)).toEqual(['online', 'retail']);
    expect(events[0].value).toBeCloseTo(30, 6);
    expect(events[1].value).toBeCloseTo(65, 6);
  });

  it('keeps a pointer that wraps past the seam inside the arc, instead of closing the circle', () => {
    const { svg, events, online, retail, other } = setup();
    const otherBefore = other.getAttribute('d');
    const wrapped = START + TWO_PI * 0.8;
    expect(Math.atan2(Math.sin(wrapped), Math.cos(wrapped))).toBeLessThan(0);

    online.dispatchEvent(pointerAt('pointerdown', SLICES[0].end - 0.05));
    svg.dispatchEvent(pointerAt('pointermove', wrapped));
    svg.dispatchEvent(pointerAt('pointerup', wrapped));

    expect(events[0].value).toBeCloseTo(80, 6);
    expect(events[1].value).toBeCloseTo(15, 6);
    expect(roundedPath(online.getAttribute('d') ?? '')).toBe(
      roundedPath(createPieSlicePath(CENTER, { start: SLICES[0].start, end: wrapped })),
    );
    expect(roundedPath(retail.getAttribute('d') ?? '')).toBe(
      roundedPath(createPieSlicePath(CENTER, { start: wrapped, end: SLICES[1].end })),
    );
    expect(other.getAttribute('d')).toBe(otherBefore);
  });

  it('lets a slice collapse to exactly zero rather than destroying it', () => {
    const { svg, events, online, retail } = setup();

    online.dispatchEvent(pointerAt('pointerdown', SLICES[0].end - 0.05));
    svg.dispatchEvent(pointerAt('pointermove', SLICES[1].end - 0.2));
    svg.dispatchEvent(pointerAt('pointermove', SLICES[1].end));
    svg.dispatchEvent(pointerAt('pointerup', SLICES[1].end));

    expect(events[0].value).toBeCloseTo(95, 6);
    expect(events[1].value).toBe(0);
    expect(retail.isConnected).toBe(true);
    expect(retail.getAttribute('d')).toBeTruthy();
    expect(roundedPath(online.getAttribute('d') ?? '')).toBe(
      roundedPath(createPieSlicePath(CENTER, { start: SLICES[0].start, end: SLICES[1].end })),
    );
  });

  it('holds a collapsed slice at zero when the pointer keeps going past the edge', () => {
    const { svg, events, online } = setup();

    online.dispatchEvent(pointerAt('pointerdown', SLICES[0].end - 0.05));
    svg.dispatchEvent(pointerAt('pointermove', SLICES[1].end - 0.05));
    svg.dispatchEvent(pointerAt('pointermove', SLICES[2].end - 0.05));
    svg.dispatchEvent(pointerAt('pointerup', SLICES[2].end - 0.05));

    expect(events[0].value).toBeCloseTo(95, 6);
    expect(events[1].value).toBe(0);
  });

  it('never lets the two dragged slices take anything from the third', () => {
    const { svg, events, online, other } = setup();
    const otherBefore = other.getAttribute('d');

    online.dispatchEvent(pointerAt('pointerdown', SLICES[0].end - 0.05));
    for (const step of [0.1, 0.9, 0.35, 0.6, 0.99, 0.02, 0.5]) {
      svg.dispatchEvent(pointerAt('pointermove', START + TWO_PI * step));
    }
    svg.dispatchEvent(pointerAt('pointerup', START + TWO_PI * 0.5));

    expect(events[0].value + events[1].value).toBeCloseTo(95, 6);
    expect(events[0].value).toBeGreaterThanOrEqual(0);
    expect(events[1].value).toBeGreaterThanOrEqual(0);
    expect(other.getAttribute('d')).toBe(otherBefore);
  });

  it('drags the last slice by its leading edge, never by the seam at twelve', () => {
    const { svg, events, online, other } = setup();
    const onlineBefore = online.getAttribute('d');

    other.dispatchEvent(pointerAt('pointerdown', SLICES[2].start + 0.02));
    svg.dispatchEvent(pointerAt('pointermove', START + TWO_PI * 0.9));
    svg.dispatchEvent(pointerAt('pointerup', START + TWO_PI * 0.9));

    expect(events.map(event => event.series)).toEqual(['retail', 'other']);
    expect(events[0].value + events[1].value).toBeCloseTo(42, 6);
    expect(events[1].value).toBeCloseTo(10, 6);
    expect(online.getAttribute('d')).toBe(onlineBefore);
  });

  it('pins the seam at twelve even when the drag pushes hard past it', () => {
    const { svg, events, retail, other } = setup();
    const seam = SLICES[2].end;

    other.dispatchEvent(pointerAt('pointerdown', SLICES[2].start + 0.02));
    svg.dispatchEvent(pointerAt('pointermove', SLICES[2].end - 0.02));
    svg.dispatchEvent(pointerAt('pointermove', START + TWO_PI * 1.1));
    svg.dispatchEvent(pointerAt('pointerup', START + TWO_PI * 1.1));

    expect(events[0].value).toBeCloseTo(42, 6);
    expect(events[1].value).toBe(0);
    expect(roundedPath(retail.getAttribute('d') ?? '')).toBe(
      roundedPath(createPieSlicePath(CENTER, { start: SLICES[1].start, end: seam })),
    );
    expect(roundedPath(other.getAttribute('d') ?? '')).toBe(
      roundedPath(createPieSlicePath(CENTER, { start: seam, end: seam })),
    );
  });

  it('does not start a drag when clicking outside any pie slice', () => {
    const { svg, events } = setup();

    svg.dispatchEvent(pointerAt('pointerdown', 0));
    svg.dispatchEvent(pointerAt('pointermove', 1.5));
    svg.dispatchEvent(pointerAt('pointerup', 1.5));

    expect(events).toHaveLength(0);
  });

  it('does nothing on a plain click with no movement', () => {
    const { svg, events, online } = setup();

    online.dispatchEvent(pointerAt('pointerdown', SLICES[0].end - 0.05));
    svg.dispatchEvent(pointerAt('pointerup', SLICES[0].end - 0.05));

    expect(events).toHaveLength(0);
  });
});
