import { beforeEach, describe, expect, it } from 'vitest';
import { Emitter } from '../src/interaction/events';
import { bindPieSliceDrag } from '../src/interaction/pieSliceDrag/binding';
import { createPieSlicePath, pieArcPoint } from '../src/rendering/charts/primitives/pieShape';
import { createFakeViewer } from './fakeViewer';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CENTER = { centerX: 200, centerY: 200, outerRadius: 100, innerRadius: 0 };
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

const SLICES: SliceSpec[] = [
  { seriesId: 'a', start: 0, end: TWO_PI / 3, value: 10 },
  { seriesId: 'b', start: TWO_PI / 3, end: (2 * TWO_PI) / 3, value: 20 },
  { seriesId: 'c', start: (2 * TWO_PI) / 3, end: TWO_PI, value: 30 },
];

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
    percentTspan.textContent = `${Math.round((slice.value / 60) * 100)}%`;
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

describe('dragging a pie slice boundary redistributes only the two adjacent slices', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('reshapes the two involved slices live and leaves the third slice completely untouched', () => {
    const { viewer, svg } = createFakeViewer();
    bindPieSliceDrag(viewer, new Emitter());
    const { elements } = buildPieChart(svg);
    const [sliceA, sliceB, sliceC] = elements;
    const dBefore = { a: sliceA.getAttribute('d'), b: sliceB.getAttribute('d'), c: sliceC.getAttribute('d') };

    const boundaryAngle = SLICES[0].end;
    sliceA.dispatchEvent(pointerAt('pointerdown', boundaryAngle - 0.05));
    svg.dispatchEvent(pointerAt('pointermove', 1.5));

    expect(sliceA.getAttribute('d')).not.toBe(dBefore.a);
    expect(sliceB.getAttribute('d')).not.toBe(dBefore.b);
    expect(sliceC.getAttribute('d')).toBe(dBefore.c);

    const expectedA = createPieSlicePath(CENTER, { start: SLICES[0].start, end: 1.5 });
    const expectedB = createPieSlicePath(CENTER, { start: 1.5, end: SLICES[1].end });
    expect(roundedPath(sliceA.getAttribute('d') ?? '')).toBe(roundedPath(expectedA));
    expect(roundedPath(sliceB.getAttribute('d') ?? '')).toBe(roundedPath(expectedB));
  });

  it('updates only the two involved percentage labels during the drag', () => {
    const { viewer, svg } = createFakeViewer();
    bindPieSliceDrag(viewer, new Emitter());
    buildPieChart(svg);
    const labelPercent = (seriesId: string) => {
      const label = [...svg.querySelectorAll('text')].find(el => el.getAttribute('data-sf-series') === seriesId);
      return label?.querySelectorAll('tspan')[1]?.textContent;
    };
    const sliceA = svg.querySelector('[data-sf-series="a"][data-sf-mark="pie-slice"]') as SVGGraphicsElement;

    const boundaryAngle = SLICES[0].end;
    sliceA.dispatchEvent(pointerAt('pointerdown', boundaryAngle - 0.05));
    svg.dispatchEvent(pointerAt('pointermove', 1.5));

    expect(labelPercent('a')).toBe('18%');
    expect(labelPercent('b')).toBe('32%');
    expect(labelPercent('c')).toBe('50%');
  });

  it('emits two chartValueChange events on release, conserving the combined value exactly', () => {
    const { viewer, svg } = createFakeViewer();
    const emitter = new Emitter();
    const events: Array<{ series: string; index: number; value: number }> = [];
    emitter.on('chartValueChange', event => events.push(event));
    bindPieSliceDrag(viewer, emitter);
    const { elements } = buildPieChart(svg);
    const [sliceA] = elements;

    const boundaryAngle = SLICES[0].end;
    sliceA.dispatchEvent(pointerAt('pointerdown', boundaryAngle - 0.05));
    svg.dispatchEvent(pointerAt('pointermove', 1.5));
    svg.dispatchEvent(pointerAt('pointerup', 1.5));

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ series: 'a', index: 0 });
    expect(events[1]).toMatchObject({ series: 'b', index: 0 });
    expect(events[0].value + events[1].value).toBeCloseTo(30, 10);
    expect(events[0].value).toBeCloseTo((30 * (1.5 - 0)) / ((TWO_PI / 3) * 2 - 0), 10);
  });

  it('does not start a drag when clicking outside any pie slice', () => {
    const { viewer, svg } = createFakeViewer();
    const emitter = new Emitter();
    const events: unknown[] = [];
    emitter.on('chartValueChange', event => events.push(event));
    bindPieSliceDrag(viewer, emitter);
    buildPieChart(svg);

    svg.dispatchEvent(pointerAt('pointerdown', 0));
    svg.dispatchEvent(pointerAt('pointermove', 1.5));
    svg.dispatchEvent(pointerAt('pointerup', 1.5));

    expect(events).toHaveLength(0);
  });

  it('does nothing on a plain click with no movement', () => {
    const { viewer, svg } = createFakeViewer();
    const emitter = new Emitter();
    const events: unknown[] = [];
    emitter.on('chartValueChange', event => events.push(event));
    bindPieSliceDrag(viewer, emitter);
    const { elements } = buildPieChart(svg);
    const [sliceA] = elements;

    const clickAngle = SLICES[0].end - 0.05;
    sliceA.dispatchEvent(pointerAt('pointerdown', clickAngle));
    svg.dispatchEvent(pointerAt('pointerup', clickAngle));

    expect(events).toHaveLength(0);
  });
});
