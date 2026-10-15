// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { bindEditing } from '../src/runtime/interaction';
import { createViewer } from '../src/runtime/viewer';

const IDENTITY = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function installSvgGeometry(): void {
  const globals = globalThis as unknown as { CSS?: { escape?: (value: string) => string } };
  globals.CSS ??= {};
  globals.CSS.escape ??= value => value.replace(/([^\w-])/g, '\\$1');
  const proto = window.SVGElement.prototype as unknown as Record<string, unknown>;
  proto.getScreenCTM = () => ({ ...IDENTITY, inverse: () => IDENTITY });
  proto.getBBox = function (this: Element) {
    const read = (name: string) => Number(this.getAttribute(name) ?? 0);
    return { x: read('x'), y: read('y'), width: read('width'), height: read('height') };
  };
  proto.setPointerCapture = () => undefined;
  proto.releasePointerCapture = () => undefined;
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

function fire(target: EventTarget, type: string, init: { clientX: number; clientY: number; pointerId?: number }) {
  const event = new window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  target.dispatchEvent(event);
}

const PIE_SFL = `sfl 1.4

Model M {
  Chart c {
    type: pie
    Series s0 { color: "#4e3180"; label: "A"; values: [50] }
    Series s1 { color: "#0ea5e9"; label: "B"; values: [50] }
    layout { position: 0, 0; size: 300, 300 }
  }
}
`;

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
  editing.on('propertyChange', detail =>
    events.push({ name: 'propertyChange', detail: detail as unknown as Record<string, unknown> }),
  );
  const svg = host.querySelector('svg') as SVGSVGElement;
  const geometry = svg.querySelector('[data-sf-pie-geometry]')?.getAttribute('data-sf-pie-geometry') ?? '';
  const [centerX, centerY, outerRadius] = geometry.split(',').map(Number);
  const label = svg.querySelector('[data-sf-series="s0"][data-sf-mark="pie-label"]') as SVGTextElement;
  return { svg, events, editing, centerX, centerY, outerRadius, label };
}

beforeAll(installSvgGeometry);

describe('pie label drag', () => {
  it('tags the in-slice label as a draggable pie-label mark', () => {
    const { label } = mount(PIE_SFL);
    expect(label).toBeTruthy();
  });

  it('pulls the label out and writes its offset from the slice edge once dragged past the ring', () => {
    const { svg, events, label, centerX, centerY, outerRadius } = mount(PIE_SFL);
    const restX = Number(label.getAttribute('x'));
    const startX = centerX + outerRadius * 0.6;
    const endX = centerX + outerRadius + 40;
    fire(label, 'pointerdown', { clientX: startX, clientY: centerY });
    fire(svg, 'pointermove', { clientX: endX, clientY: centerY });
    fire(svg, 'pointerup', { clientX: endX, clientY: centerY });
    expect(events.map(event => event.detail.path)).toEqual(['Series[s0].labelOffsetX', 'Series[s0].labelOffsetY']);
    const offsetX = events[0].detail.value as number;
    expect(offsetX).toBe(Math.round(restX + (endX - startX) - (centerX + outerRadius)));
    expect(offsetX).toBeGreaterThan(0);
  });

  it('pushes an already-pulled label back into the ring and resets its offset', () => {
    const pulled = PIE_SFL.replace(
      'Series s0 { color: "#4e3180"; label: "A"; values: [50] }',
      'Series s0 { color: "#4e3180"; label: "A"; values: [50]; labelOffsetX: 30; labelOffsetY: 0 }',
    );
    const { svg, events, label, centerX, centerY, outerRadius } = mount(pulled);
    const labelX = Number(label.getAttribute('x'));
    const labelY = Number(label.getAttribute('y'));
    fire(label, 'pointerdown', { clientX: labelX, clientY: labelY });
    fire(svg, 'pointermove', { clientX: centerX + outerRadius * 0.3, clientY: centerY });
    fire(svg, 'pointerup', { clientX: centerX + outerRadius * 0.3, clientY: centerY });
    expect(events.map(event => [event.detail.path, event.detail.value])).toEqual([
      ['Series[s0].labelOffsetX', 0],
      ['Series[s0].labelOffsetY', 0],
    ]);
  });

  it('treats a plain click (no real movement) as a no-op, not a drag', () => {
    const { svg, events, label, centerX, centerY, outerRadius } = mount(PIE_SFL);
    fire(label, 'pointerdown', { clientX: centerX + outerRadius * 0.6, clientY: centerY });
    fire(svg, 'pointerup', { clientX: centerX + outerRadius * 0.6, clientY: centerY });
    expect(events).toEqual([]);
  });

  it('moves the live label element during the drag, so it visibly follows the pointer', () => {
    const { svg, label, centerX, centerY, outerRadius } = mount(PIE_SFL);
    fire(label, 'pointerdown', { clientX: centerX + outerRadius * 0.6, clientY: centerY });
    fire(svg, 'pointermove', { clientX: centerX + outerRadius + 40, clientY: centerY });
    expect(label.getAttribute('transform')).toContain('translate(');
    fire(svg, 'pointerup', { clientX: centerX + outerRadius + 40, clientY: centerY });
    expect(label.hasAttribute('transform')).toBe(false);
  });
});
