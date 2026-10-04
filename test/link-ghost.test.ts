// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { bindEditing } from '../src/runtime/interaction';
import { resolveLinkTarget } from '../src/runtime/interaction/linkGhost/target';
import { createViewer } from '../src/runtime/viewer';

const numbers = (d: string) => (d.match(/-?[\d.]+/g) ?? []).map(Number);
const xsOf = (d: string) => numbers(d).filter((_, index) => index % 2 === 0);

const SFL = `sfl 1.4

Model M {
  Shape a { style { shape: rectangle }; layout { position: 0, 0; size: 100, 60 } }
  Shape b { style { shape: rectangle }; layout { position: 300, 0; size: 100, 60 } }
  Link l {
    from: a, right
    to: b, left
    style { pathType: orthogonal; stroke: "gradient(90, #2563eb 0%, #ec4899 100%)"; strokeWidth: 2 }
  }
}
`;

interface DragDetail {
  fraction?: number;
  target?: { id: string };
}

const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function installSvgGeometry(): void {
  const globals = globalThis as unknown as { CSS?: { escape?: (value: string) => string } };
  globals.CSS ??= {};
  globals.CSS.escape ??= value => value.replace(/([^\w-])/g, '$1');
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
  proto.getPointAtLength = function (this: Element, length: number) {
    const values = numbers(this.getAttribute('d') ?? '');
    return length === 0
      ? { x: values[0], y: values[1] }
      : { x: values[values.length - 2], y: values[values.length - 1] };
  };
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

function fire(target: Element, type: string, init: { clientX: number; clientY: number; pointerId?: number }) {
  const event = new window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  target.dispatchEvent(event);
}

function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const viewer = createViewer({ container: host, source: SFL, interactive: true, selectable: true });
  const editing = bindEditing(viewer, {});
  const events: Array<{ name: string; detail: DragDetail }> = [];
  for (const name of ['linkReconnect', 'linkTo'] as const) {
    editing.on(name, detail => events.push({ name, detail: detail as unknown as DragDetail }));
  }
  const svg = host.querySelector('svg') as SVGSVGElement;
  const link = () => svg.querySelector('[data-sf-role="link"][data-sf-primary]') as SVGPathElement;
  const anchors = () => svg.querySelectorAll('[data-sf-link-target] circle').length;
  const selectLink = () => {
    fire(link(), 'pointerdown', { clientX: 200, clientY: 30 });
    fire(link(), 'pointerup', { clientX: 200, clientY: 30 });
  };
  const dragEndpoint = (moves: Array<[number, number]>, release: boolean) => {
    selectLink();
    const handle = svg.querySelector('[data-sf-link-endpoint="to"]') as Element;
    fire(handle, 'pointerdown', { clientX: 300, clientY: 30, pointerId: 2 });
    for (const [x, y] of moves) {
      fire(svg, 'pointermove', { clientX: x, clientY: y, pointerId: 2 });
    }
    if (release) {
      const [x, y] = moves[moves.length - 1];
      fire(svg, 'pointerup', { clientX: x, clientY: y, pointerId: 2 });
    }
  };
  return { svg, link, anchors, events, dragEndpoint, editing, viewer };
}

beforeAll(installSvgGeometry);

describe('dragging a link endpoint shows a ghost of the link', () => {
  it('turns the link into a dashed grey ghost while free, and restores it exactly on release', () => {
    const { link, dragEndpoint, anchors } = mount();
    const original = {
      stroke: link().getAttribute('stroke'),
      dash: link().getAttribute('stroke-dasharray'),
      opacity: link().getAttribute('opacity'),
    };
    expect(original.stroke).toMatch(/^url\(#/);

    dragEndpoint([[520, 150]], false);
    expect(link().getAttribute('stroke')).toBe('#727272');
    expect(link().getAttribute('stroke-dasharray')).toMatch(/^[\d.]+ [\d.]+$/);
    expect(link().getAttribute('opacity')).toBe('0.7');
    expect(anchors()).toBe(0);

    fire(link().ownerSVGElement as unknown as Element, 'pointerup', { clientX: 520, clientY: 150, pointerId: 2 });
    expect(link().getAttribute('stroke')).toBe(original.stroke);
    expect(link().getAttribute('stroke-dasharray')).toBe(original.dash);
    expect(link().getAttribute('opacity')).toBe(original.opacity);
  });

  it('turns purple and marks the four anchors of a shape it is over, within a 15px margin', () => {
    const { link, dragEndpoint, anchors } = mount();
    dragEndpoint(
      [
        [520, 150],
        [405, 40],
      ],
      false,
    );
    expect(link().getAttribute('stroke')).toBe('#992dff');
    expect(anchors()).toBe(4);
  });

  it('approaches a free end from the side facing the source, instead of overshooting and hooking back', () => {
    const { link, dragEndpoint } = mount();
    dragEndpoint([[520, 150]], false);
    expect(Math.max(...xsOf(link().getAttribute('d') ?? ''))).toBeLessThanOrEqual(520.01);
  });

  it('snaps to the middle of an edge near it and slides freely further away', () => {
    const nearMiddle = mount();
    nearMiddle.dragEndpoint([[300, 34]], true);
    expect(nearMiddle.events.find(event => event.name === 'linkReconnect')?.detail.fraction).toBe(0.5);

    const farFromMiddle = mount();
    farFromMiddle.dragEndpoint([[300, 10]], true);
    expect(farFromMiddle.events.find(event => event.name === 'linkReconnect')?.detail.fraction).not.toBe(0.5);
  });
});

describe('the quick-duplicate bubble drags a ghost too', () => {
  it('shows a dashed grey ghost, turns purple over a shape, and leaves nothing behind', () => {
    const { svg, anchors, events } = mount();
    const a = svg.querySelector('[data-sf-id="a"][data-sf-primary]') as Element;
    fire(a, 'pointerdown', { clientX: 50, clientY: 30 });
    fire(a, 'pointerup', { clientX: 50, clientY: 30 });
    const bubble = svg.querySelector('[data-sf-quick-duplicate="right"]') as Element;
    const ghosts = () =>
      [...svg.querySelectorAll('path')].filter(
        path => path.getAttribute('stroke-dasharray') && !path.getAttribute('data-sf-role'),
      );

    fire(bubble, 'pointerdown', { clientX: 123, clientY: 30, pointerId: 5 });
    fire(svg, 'pointermove', { clientX: 220, clientY: 200, pointerId: 5 });
    expect(ghosts()).toHaveLength(1);
    expect(ghosts()[0].getAttribute('stroke')).toBe('#727272');
    expect(Math.max(...xsOf(ghosts()[0].getAttribute('d') ?? ''))).toBeLessThanOrEqual(220.01);

    fire(svg, 'pointermove', { clientX: 398, clientY: 35, pointerId: 5 });
    expect(ghosts()[0].getAttribute('stroke')).toBe('#992dff');
    expect(anchors()).toBe(4);

    fire(svg, 'pointerup', { clientX: 398, clientY: 35, pointerId: 5 });
    expect(events.find(event => event.name === 'linkTo')?.detail.target?.id).toBe('b');
    expect(ghosts()).toHaveLength(0);
    expect(anchors()).toBe(0);
  });
});

describe('resolving where a dragged link end lands', () => {
  const box = (id: string, x: number, y: number) => ({
    owner: { role: 'shape' as const, id },
    bounds: { x, y, width: 100, height: 60 },
  });

  it('faces a free end toward the fixed end on the correct side of each direction', () => {
    const from = { x: 0, y: 0 };
    expect(resolveLinkTarget([], from, { x: 200, y: 0 }, 1).side).toBe('left');
    expect(resolveLinkTarget([], from, { x: -200, y: 0 }, 1).side).toBe('right');
    expect(resolveLinkTarget([], from, { x: 0, y: 200 }, 1).side).toBe('top');
    expect(resolveLinkTarget([], from, { x: 0, y: -200 }, 1).side).toBe('bottom');
  });

  it('treats a point just outside a shape as over it, but not one beyond the margin', () => {
    const candidates = [box('a', 0, 0)];
    expect(resolveLinkTarget(candidates, { x: 500, y: 500 }, { x: 110, y: 30 }, 1).hit?.owner.id).toBe('a');
    expect(resolveLinkTarget(candidates, { x: 500, y: 500 }, { x: 130, y: 30 }, 1).hit).toBeNull();
  });

  it('scales the margin and the magnet with zoom, so they stay the same size on screen', () => {
    const candidates = [box('a', 0, 0)];
    const zoomedOut = 4;
    expect(resolveLinkTarget(candidates, { x: 500, y: 500 }, { x: 150, y: 30 }, zoomedOut).hit?.owner.id).toBe('a');
    expect(resolveLinkTarget(candidates, { x: 500, y: 500 }, { x: 50, y: 30 + 40 }, zoomedOut).hit?.offset).toBe(0.5);
  });

  it('prefers the shape a point is inside over one it is merely near', () => {
    const candidates = [box('inside', 0, 0), box('near', 108, 0)];
    expect(resolveLinkTarget(candidates, { x: 500, y: 500 }, { x: 50, y: 30 }, 1).hit?.owner.id).toBe('inside');
  });
});
