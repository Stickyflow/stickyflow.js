// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { bindEditing } from '../src/interaction';
import { createViewer } from '../src/viewer';

const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function installSvgGeometry(): void {
  const globals = globalThis as unknown as { CSS?: { escape?: (value: string) => string } };
  globals.CSS ??= {};
  globals.CSS.escape ??= value => value.replace(/([^\w-])/g, '\\$1');
  const proto = window.SVGElement.prototype as unknown as Record<string, unknown>;
  proto.getBBox = function (this: Element) {
    const read = (name: string) => Number(this.getAttribute(name) ?? 0) || 0;
    return this.tagName === 'rect'
      ? { x: read('x'), y: read('y'), width: read('width'), height: read('height') }
      : { x: 0, y: 0, width: 10, height: 10 };
  };
  proto.getScreenCTM = () => ({ ...IDENTITY, inverse: () => IDENTITY });
  proto.setPointerCapture = () => undefined;
  proto.releasePointerCapture = () => undefined;
  proto.getTotalLength = () => 1;
  proto.getPointAtLength = () => ({ x: 0, y: 0 });
  (window.Element.prototype as unknown as Record<string, unknown>).getBoundingClientRect = function (this: Element) {
    const width = this.tagName === 'svg' ? Number((this.getAttribute('viewBox') ?? '0 0 1 1').split(' ')[2]) : 0;
    return { x: 0, y: 0, width, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
  };
  (globalThis as unknown as Record<string, unknown>).DOMPoint = class {
    constructor(
      public x: number,
      public y: number,
    ) {}
    matrixTransform(matrix: typeof IDENTITY) {
      return {
        x: this.x * matrix.a + this.y * matrix.c + matrix.e,
        y: this.x * matrix.b + this.y * matrix.d + matrix.f,
      };
    }
  };
}

function fire(
  target: EventTarget,
  type: string,
  init: { clientX: number; clientY: number; pointerId?: number; key?: string },
) {
  const isKeyEvent = type === 'keydown' || type === 'keyup';
  const event = isKeyEvent
    ? new window.KeyboardEvent(type, { bubbles: true, cancelable: true, key: init.key })
    : new window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init });
  if (!isKeyEvent) {
    Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  }
  target.dispatchEvent(event);
}

interface EventLog {
  name: string;
  detail: Record<string, unknown>;
}

function mount(sfl: string) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const viewer = createViewer({ container: host, source: sfl, interactive: true, selectable: true });
  const editing = bindEditing(viewer, {});
  const events: EventLog[] = [];
  for (const name of ['moveChange', 'pathPointChange', 'pathDrawComplete', 'delete'] as const) {
    editing.on(name, detail => events.push({ name, detail: detail as unknown as Record<string, unknown> }));
  }
  viewer.on('selectionChange', detail =>
    events.push({ name: 'selectionChange', detail: detail as unknown as Record<string, unknown> }),
  );
  const svg = host.querySelector('svg') as SVGSVGElement;
  const pathNode = () => svg.querySelector('[data-sf-role="path"][data-sf-primary]') as SVGPathElement;
  return { svg, pathNode, events, editing, viewer };
}

beforeAll(installSvgGeometry);

const PATH_SFL = `sfl 1.4

Model M {
  Path p {
    points: [[20, 20], [120, 20], [120, 100]]
    style { stroke: "#7c3aed" }
  }
  Entity other {
    style { shape: rectangle }
    layout { position: 300, 300; size: 80, 60 }
  }
}
`;

describe('selecting an existing Path', () => {
  it('paints one handle per point, not the 8 box-resize handles a shape would get', () => {
    const { svg, pathNode } = mount(PATH_SFL);
    fire(pathNode(), 'pointerdown', { clientX: 60, clientY: 20 });
    fire(pathNode(), 'pointerup', { clientX: 60, clientY: 20 });
    expect(svg.querySelectorAll('[data-sf-resize-handle]')).toHaveLength(0);
    expect(svg.querySelectorAll('[data-sf-path-point]')).toHaveLength(3);
  });

  it('can still be dragged as a whole by its stroke, shifting every point by the same delta', () => {
    const { pathNode, events } = mount(PATH_SFL);
    fire(pathNode(), 'pointerdown', { clientX: 60, clientY: 20, pointerId: 2 });
    fire(pathNode(), 'pointermove', { clientX: 100, clientY: 60, pointerId: 2 });
    fire(pathNode(), 'pointerup', { clientX: 100, clientY: 60, pointerId: 2 });
    const move = events.find(event => event.name === 'moveChange');
    expect(move?.detail).toMatchObject({ dx: 40, dy: 40 });
  });
});

describe('dragging a Path point handle', () => {
  it('reshapes only that point, updating the live path and halo, and commits pathPointChange', () => {
    const { svg, pathNode, events } = mount(PATH_SFL);
    fire(pathNode(), 'pointerdown', { clientX: 60, clientY: 20 });
    fire(pathNode(), 'pointerup', { clientX: 60, clientY: 20 });

    const handle = svg.querySelector('[data-sf-path-point="1"]') as SVGCircleElement;
    expect(handle).toBeTruthy();
    fire(handle, 'pointerdown', { clientX: 120, clientY: 20, pointerId: 3 });
    fire(svg, 'pointermove', { clientX: 160, clientY: 60, pointerId: 3 });

    expect(pathNode().getAttribute('d')).toBe('M 20 20 L 160 60 L 120 100');
    const halo = svg.querySelector('[data-sf-path-halo]');
    expect(halo?.getAttribute('d')).toBe('M 20 20 L 160 60 L 120 100');
    expect(handle.getAttribute('cx')).toBe('160');
    expect(handle.getAttribute('cy')).toBe('60');

    fire(svg, 'pointerup', { clientX: 160, clientY: 60, pointerId: 3 });
    const change = events.find(event => event.name === 'pathPointChange');
    expect(change?.detail.points).toEqual([
      { x: 20, y: 20 },
      { x: 160, y: 60 },
      { x: 120, y: 100 },
    ]);
  });

  it('leaves the other points untouched', () => {
    const { svg, pathNode, events } = mount(PATH_SFL);
    fire(pathNode(), 'pointerdown', { clientX: 60, clientY: 20 });
    fire(pathNode(), 'pointerup', { clientX: 60, clientY: 20 });
    const handle = svg.querySelector('[data-sf-path-point="0"]') as SVGCircleElement;
    fire(handle, 'pointerdown', { clientX: 20, clientY: 20, pointerId: 4 });
    fire(svg, 'pointermove', { clientX: -10, clientY: -10, pointerId: 4 });
    fire(svg, 'pointerup', { clientX: -10, clientY: -10, pointerId: 4 });
    const change = events.find(event => event.name === 'pathPointChange');
    expect(change?.detail.points).toEqual([
      { x: -10, y: -10 },
      { x: 120, y: 20 },
      { x: 120, y: 100 },
    ]);
  });
});

describe('the path-drawing tool', () => {
  it('does nothing until start() is called', () => {
    const { svg, events } = mount(PATH_SFL);
    fire(svg, 'pointerdown', { clientX: 400, clientY: 400 });
    fire(svg, 'pointerup', { clientX: 400, clientY: 400 });
    expect(svg.querySelectorAll('[data-sf-path-point]')).toHaveLength(0);
    expect(events.filter(event => event.name === 'pathDrawComplete')).toHaveLength(0);
  });

  it('places a point per click, closes on a click back near the start, and reports it as a new closed Path', () => {
    const { svg, editing, events } = mount(PATH_SFL);
    editing.startPathDraw();

    fire(svg, 'pointerdown', { clientX: 0, clientY: 0 });
    fire(svg, 'pointerdown', { clientX: 100, clientY: 0 });
    fire(svg, 'pointerdown', { clientX: 100, clientY: 100 });
    fire(svg, 'pointermove', { clientX: 4, clientY: 3 });
    fire(svg, 'pointerdown', { clientX: 4, clientY: 3 });

    const complete = events.find(event => event.name === 'pathDrawComplete');
    expect(complete?.detail).toEqual({
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      closed: true,
      tension: 0,
    });
    expect(svg.querySelector('[pointer-events="none"] path')).toBeFalsy();
  });

  it('finishes an open path on double-click without appending a duplicate point', () => {
    const { svg, editing, events } = mount(PATH_SFL);
    editing.startPathDraw();
    fire(svg, 'pointerdown', { clientX: 0, clientY: 0 });
    fire(svg, 'pointerdown', { clientX: 50, clientY: 0 });
    fire(svg, 'pointerdown', { clientX: 50, clientY: 50 });
    fire(svg, 'dblclick', { clientX: 50, clientY: 50 });

    const complete = events.find(event => event.name === 'pathDrawComplete');
    expect(complete?.detail).toEqual({
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ],
      closed: false,
      tension: 0,
    });
  });

  it('cancels on Escape without emitting, and calls onExit', () => {
    const { svg, editing, events } = mount(PATH_SFL);
    let exited = false;
    editing.startPathDraw({ onExit: () => (exited = true) });
    fire(svg, 'pointerdown', { clientX: 0, clientY: 0 });
    fire(svg, 'pointerdown', { clientX: 50, clientY: 0 });
    fire(window, 'keydown', { clientX: 0, clientY: 0, key: 'Escape' });

    expect(exited).toBe(true);
    expect(events.filter(event => event.name === 'pathDrawComplete')).toHaveLength(0);
    expect(svg.querySelectorAll('[data-sf-path-point], [pointer-events="none"] circle')).toHaveLength(0);
  });

  it('constrains the next segment to 45 degrees while Shift is held, and stops once released', () => {
    const { svg, editing, events } = mount(PATH_SFL);
    editing.startPathDraw();
    fire(svg, 'pointerdown', { clientX: 0, clientY: 0 });

    fire(window, 'keydown', { clientX: 0, clientY: 0, key: 'Shift' });
    fire(svg, 'pointerdown', { clientX: 100, clientY: 8 });
    fire(window, 'keyup', { clientX: 0, clientY: 0, key: 'Shift' });
    fire(svg, 'pointerdown', { clientX: 150, clientY: 40 });
    fire(svg, 'dblclick', { clientX: 150, clientY: 40 });

    const complete = events.find(event => event.name === 'pathDrawComplete');
    const points = complete?.detail.points as Array<{ x: number; y: number }>;
    expect(points[1].y).toBeCloseTo(0, 6);
    expect(points[2]).toEqual({ x: 150, y: 40 });
  });

  it('removes the last placed point on Backspace without ending the session', () => {
    const { svg, editing, events } = mount(PATH_SFL);
    editing.startPathDraw();
    fire(svg, 'pointerdown', { clientX: 0, clientY: 0 });
    fire(svg, 'pointerdown', { clientX: 50, clientY: 0 });
    fire(svg, 'pointerdown', { clientX: 999, clientY: 999 });

    fire(window, 'keydown', { clientX: 0, clientY: 0, key: 'Backspace' });
    expect(svg.querySelectorAll('[pointer-events="none"] circle')).toHaveLength(2);

    fire(svg, 'pointerdown', { clientX: 50, clientY: 50 });
    fire(svg, 'dblclick', { clientX: 50, clientY: 50 });

    const complete = events.find(event => event.name === 'pathDrawComplete');
    expect(complete?.detail).toEqual({
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ],
      closed: false,
      tension: 0,
    });
  });

  it('Backspace down to zero points keeps the session alive to place new ones', () => {
    const { svg, editing, events } = mount(PATH_SFL);
    editing.startPathDraw();
    fire(svg, 'pointerdown', { clientX: 0, clientY: 0 });
    fire(window, 'keydown', { clientX: 0, clientY: 0, key: 'Backspace' });
    expect(svg.querySelectorAll('[pointer-events="none"] circle')).toHaveLength(0);

    fire(svg, 'pointerdown', { clientX: 200, clientY: 200 });
    fire(svg, 'pointerdown', { clientX: 240, clientY: 200 });
    fire(svg, 'dblclick', { clientX: 240, clientY: 200 });
    const complete = events.find(event => event.name === 'pathDrawComplete');
    expect(complete?.detail).toMatchObject({ closed: false });
  });

  it('aligns onto an earlier point with a guide while Shift is held, letting you close an exact square', () => {
    const { svg, editing, events } = mount(PATH_SFL);
    editing.startPathDraw();
    fire(window, 'keydown', { clientX: 0, clientY: 0, key: 'Shift' });
    fire(svg, 'pointerdown', { clientX: 0, clientY: 0 });
    fire(svg, 'pointerdown', { clientX: 100, clientY: 0 });
    fire(svg, 'pointerdown', { clientX: 100, clientY: 100 });

    fire(svg, 'pointermove', { clientX: 5, clientY: 97 });
    expect(svg.querySelector('[data-sf-alignment-guides] line')).toBeTruthy();

    fire(svg, 'pointerdown', { clientX: 5, clientY: 97 });
    expect(svg.querySelector('[data-sf-alignment-guides]')).toBeFalsy();
    fire(window, 'keyup', { clientX: 0, clientY: 0, key: 'Shift' });
    fire(svg, 'dblclick', { clientX: 5, clientY: 97 });

    const complete = events.find(event => event.name === 'pathDrawComplete');
    const points = complete?.detail.points as Array<{ x: number; y: number }>;
    expect(points[3].x).toBeCloseTo(0, 6);
    expect(points[3].y).toBeCloseTo(100, 6);
  });

  it('clears any existing selection when entering draw mode, so Backspace cannot delete something stale mid-draw', () => {
    const { svg, editing, events } = mount(PATH_SFL);
    fire(svg.querySelector('[data-sf-id="other"][data-sf-primary]') as Element, 'pointerdown', {
      clientX: 320,
      clientY: 320,
    });
    fire(svg.querySelector('[data-sf-id="other"][data-sf-primary]') as Element, 'pointerup', {
      clientX: 320,
      clientY: 320,
    });
    expect(svg.querySelectorAll('[data-sf-selection-overlay]').length).toBeGreaterThan(0);

    editing.startPathDraw();
    expect(svg.querySelectorAll('[data-sf-selection-overlay]')).toHaveLength(0);

    fire(svg, 'pointerdown', { clientX: 200, clientY: 200 });
    fire(window, 'keydown', { clientX: 0, clientY: 0, key: 'Backspace' });
    expect(events.filter(event => event.name === 'delete')).toHaveLength(0);
  });

  it('does not let a placement click also select an existing entity underneath it', () => {
    const { svg, editing, events } = mount(PATH_SFL);
    editing.startPathDraw();
    const other = svg.querySelector('[data-sf-id="other"][data-sf-primary]') as SVGGraphicsElement;
    other.setAttribute('x', '0');
    other.setAttribute('y', '0');
    other.setAttribute('width', '80');
    other.setAttribute('height', '60');
    fire(other, 'pointerdown', { clientX: 20, clientY: 20 });
    fire(other, 'pointerup', { clientX: 20, clientY: 20 });
    expect(
      events.filter(event => event.name === 'selectionChange' && (event.detail.selection as unknown[])?.length),
    ).toHaveLength(0);
  });
});

describe('deleting a whole, already-selected Path with Backspace (outside a draw session)', () => {
  it('reports the selected Path via the delete event, the same as any other entity', () => {
    const { svg, pathNode, events } = mount(PATH_SFL);
    fire(pathNode(), 'pointerdown', { clientX: 60, clientY: 20 });
    fire(pathNode(), 'pointerup', { clientX: 60, clientY: 20 });

    fire(svg, 'keydown', { clientX: 0, clientY: 0, key: 'Backspace' });
    const deleted = events.find(event => event.name === 'delete');
    expect(deleted?.detail.owners).toMatchObject([{ role: 'path', id: 'p' }]);
  });
});
