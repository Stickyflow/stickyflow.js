import { beforeEach, describe, expect, it } from 'vitest';
import { bindChartValueDrag } from '../src/runtime/interaction/chartValueDrag';
import { Emitter } from '../src/runtime/interaction/events';
import { createFakeViewer } from './fakeViewer';

const SVG_NS = 'http://www.w3.org/2000/svg';

if (typeof globalThis.CSS === 'undefined') {
  globalThis.CSS = { escape: (value: string) => value.replace(/[^\w-]/g, '\\$&') } as typeof globalThis.CSS;
}

function buildChart(svg: SVGSVGElement) {
  svg.setAttribute('viewBox', '0 0 400 300');
  Object.defineProperty(svg, 'getScreenCTM', { value: () => null, configurable: true });

  const chart = document.createElementNS(SVG_NS, 'rect') as SVGGraphicsElement;
  chart.setAttribute('data-sf-role', 'chart');
  chart.setAttribute('data-sf-id', 'c');
  chart.setAttribute('data-sf-primary', 'true');
  chart.setAttribute('data-sf-value-scale', '40,200,0,100');
  svg.appendChild(chart);

  const bar = document.createElementNS(SVG_NS, 'path') as SVGGraphicsElement;
  bar.setAttribute('data-sf-role', 'chart');
  bar.setAttribute('data-sf-id', 'c');
  bar.setAttribute('data-sf-series', 'online');
  bar.setAttribute('data-sf-value-index', '1');
  bar.setAttribute('data-sf-mark', 'bar');
  bar.setAttribute('data-sf-bar-radius', '2');
  bar.setAttribute('d', 'M 100 140 H 140 V 240 H 100 Z');
  Object.defineProperty(bar, 'getBBox', {
    value: () => ({ x: 100, y: 140, width: 40, height: 100 }),
    configurable: true,
  });
  svg.appendChild(bar);
  return bar;
}

function pointer(type: string, clientY: number): PointerEvent {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: 120, clientY });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event as PointerEvent;
}

const readout = () => document.querySelector('[data-sf-value-readout]');

describe('the value readout while dragging a bar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is absent before anything is dragged', () => {
    const { viewer, svg } = createFakeViewer();
    bindChartValueDrag(viewer, new Emitter());
    buildChart(svg);
    expect(readout()).toBeNull();
  });

  it('does not appear on a plain click without movement', () => {
    const { viewer, svg } = createFakeViewer();
    bindChartValueDrag(viewer, new Emitter());
    const bar = buildChart(svg);

    bar.dispatchEvent(pointer('pointerdown', 200));
    bar.dispatchEvent(pointer('pointerup', 200));
    expect(readout()).toBeNull();
  });

  it('appears once the pointer moves and is removed again on release', () => {
    const { viewer, svg } = createFakeViewer();
    bindChartValueDrag(viewer, new Emitter());
    const bar = buildChart(svg);

    bar.dispatchEvent(pointer('pointerdown', 200));
    svg.dispatchEvent(pointer('pointermove', 150));
    expect(readout()).not.toBeNull();

    svg.dispatchEvent(pointer('pointerup', 150));
    expect(readout()).toBeNull();
  });

  it('never takes pointer events away from the chart underneath', () => {
    const { viewer, svg } = createFakeViewer();
    bindChartValueDrag(viewer, new Emitter());
    const bar = buildChart(svg);

    bar.dispatchEvent(pointer('pointerdown', 200));
    svg.dispatchEvent(pointer('pointermove', 150));
    expect(readout()?.getAttribute('pointer-events')).toBe('none');
  });

  it('is cleaned up when the binding is destroyed mid-drag', () => {
    const { viewer, svg } = createFakeViewer();
    const handle = bindChartValueDrag(viewer, new Emitter());
    const bar = buildChart(svg);

    bar.dispatchEvent(pointer('pointerdown', 200));
    svg.dispatchEvent(pointer('pointermove', 150));
    expect(readout()).not.toBeNull();

    handle.destroy();
    expect(readout()).toBeNull();
  });
});
