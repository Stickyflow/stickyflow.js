import { parseHexRgb } from '../../../model/color';

const bases = new WeakMap<Element, string>();
const written = new WeakMap<Element, string>();
const fills = new WeakMap<Element, string>();

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function parameters(surface: Element): Record<string, unknown> {
  try {
    return JSON.parse(surface.getAttribute('data-sf-shader-params') ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function positive(value: unknown, fallback: number): number {
  return Number(value) > 0 ? Number(value) : fallback;
}

export function rulerProgress(surface: Element, value: number): number {
  const params = parameters(surface);
  const min = Number(params.min) || 0;
  const max = Number.isFinite(Number(params.max)) && params.max !== undefined ? Number(params.max) : 100;
  return clamp01(max === min ? 0 : (value - min) / (max - min));
}

function move(node: Element, dx: number, dy: number): void {
  const current = node.getAttribute('transform') ?? '';
  const base = current === written.get(node) ? (bases.get(node) ?? '') : current;
  bases.set(node, base);
  const next = `translate(${dx} ${dy}) ${base}`.trim();
  written.set(node, next);
  node.setAttribute('transform', next);
}

const WHITE: [number, number, number] = [255, 255, 255];

function shade(node: SVGElement, bump: number, target: [number, number, number]): void {
  const base = fills.get(node) ?? node.getAttribute('fill') ?? '';
  fills.set(node, base);
  const rgb = parseHexRgb(base);
  if (!rgb) {
    return;
  }
  const mixed = rgb.map((channel, index) => Math.round(channel + (target[index] - channel) * bump));
  const fill = `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
  node.style.fill = fill;
  for (const child of node.querySelectorAll<SVGElement>('tspan')) {
    child.style.fill = fill;
  }
}

export function placeRulerKnobs(
  svg: SVGSVGElement,
  progressOf: (id: string) => number | undefined,
): Map<string, number> {
  const radii = new Map<string, number>();
  for (const surface of svg.querySelectorAll('foreignObject[data-sf-shader="ruler"]')) {
    const params = parameters(surface);
    const peak = (typeof params.peak === 'string' ? parseHexRgb(params.peak) : null) ?? WHITE;
    const id = surface.getAttribute('data-sf-id') ?? '';
    const x = Number(surface.getAttribute('x'));
    const y = Number(surface.getAttribute('y'));
    const width = Number(surface.getAttribute('width'));
    const height = Number(surface.getAttribute('height'));
    const horizontal = params.axis === 'horizontal';
    const progress = clamp01(progressOf(id) ?? Number(params.progress));
    const inset = positive(params.inset, 0.05);
    const line = positive(params.line, 0.7);
    const extent = horizontal ? width : height;
    const across = horizontal ? height : width;
    const along = inset + (1 - 2 * inset) * progress;
    const dent = params.dent === undefined ? 1 : Number(params.dent);
    const depth = (dent < 0 ? 1 : dent) * 0.16 * across;

    const knobId = typeof params.knob === 'string' ? params.knob : '';
    if (knobId) {
      const nodes = [...svg.querySelectorAll(`[data-sf-id="${CSS.escape(knobId)}"]`)];
      const primary = nodes.find(node => node.hasAttribute('data-sf-primary')) as SVGGraphicsElement | undefined;
      if (primary?.getBBox) {
        move(primary, 0, 0);
        const box = primary.getBBox();
        const half = (horizontal ? box.height : box.width) / 2;
        radii.set(id, half / across);
        const gap = (params.gap === undefined ? 0.04 : Number(params.gap)) * across;
        const side = line * across - depth + half + gap;
        const target = horizontal
          ? { x: x + width * along, y: y + side }
          : { x: x + side, y: y + height * (1 - along) };
        const dx = target.x - (box.x + box.width / 2);
        const dy = target.y - (box.y + box.height / 2);
        for (const node of nodes) {
          move(node, dx, dy);
        }
      }
    }

    const min = Number(params.min) || 0;
    const max = Number.isFinite(Number(params.max)) && params.max !== undefined ? Number(params.max) : 100;
    const spread = positive(params.spread, 0.07) * extent;
    const start = inset * extent;
    const span = (1 - 2 * inset) * extent;
    const knobAt = start + span * progress;
    for (const label of svg.querySelectorAll<SVGTextElement>(`text[data-sf-id="${CSS.escape(id)}"]`)) {
      const value = Number(label.textContent);
      if (!Number.isFinite(value) || max === min) {
        continue;
      }
      const labelAt = start + span * clamp01((value - min) / (max - min));
      const bump = Math.exp(-(((labelAt - knobAt) / spread) ** 2));
      const shift = depth * 0.4 * bump;
      move(label, horizontal ? 0 : -shift, horizontal ? -shift : 0);
      shade(label, bump, peak);
    }
  }
  return radii;
}
