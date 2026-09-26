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
  proto.getScreenCTM = () => ({ ...IDENTITY, inverse: () => IDENTITY });
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

  it('pulls the label out and writes labelPulled: true once dragged past the ring', () => {
    const { svg, events, label, centerX, centerY, outerRadius } = mount(PIE_SFL);
    fire(label, 'pointerdown', { clientX: centerX + outerRadius * 0.6, clientY: centerY });
    fire(svg, 'pointermove', { clientX: centerX + outerRadius + 40, clientY: centerY });
    fire(svg, 'pointerup', { clientX: centerX + outerRadius + 40, clientY: centerY });
    expect(events).toMatchObject([
      {
        name: 'propertyChange',
        detail: { owner: { role: 'chart', id: 'c' }, path: 'Series[s0].labelPulled', value: true },
      },
    ]);
  });

  it('pushes an already-pulled label back and writes labelPulled: false', () => {
    const pulled = PIE_SFL.replace(
      'Series s0 { color: "#4e3180"; label: "A"; values: [50] }',
      'Series s0 { color: "#4e3180"; label: "A"; values: [50]; labelPulled: true }',
    );
    const { svg, events, label, centerX, centerY, outerRadius } = mount(pulled);
    fire(label, 'pointerdown', { clientX: centerX + outerRadius + 20, clientY: centerY });
    fire(svg, 'pointermove', { clientX: centerX + outerRadius * 0.5, clientY: centerY });
    fire(svg, 'pointerup', { clientX: centerX + outerRadius * 0.5, clientY: centerY });
    expect(events).toMatchObject([
      {
        name: 'propertyChange',
        detail: { owner: { role: 'chart', id: 'c' }, path: 'Series[s0].labelPulled', value: false },
      },
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
