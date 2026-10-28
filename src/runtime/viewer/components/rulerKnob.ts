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

function rangeOf(params: Record<string, unknown>): { min: number; max: number } {
  return {
    min: Number(params.min) || 0,
    max: Number.isFinite(Number(params.max)) && params.max !== undefined ? Number(params.max) : 100,
  };
}

export function rulerProgress(surface: Element, value: number): number {
  const { min, max } = rangeOf(parameters(surface));
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

// What a ruler needs to place its knob and to lift its numbers: where it is, which way it runs and how it is set.
interface Ruler {
  id: string;
  params: Record<string, unknown>;
  x: number;
  y: number;
  width: number;
  height: number;
  horizontal: boolean;
  progress: number;
  inset: number;
  // The length of the ruler, and how far it reaches across.
  extent: number;
  across: number;
  // How far the wire bends in around the knob.
  depth: number;
}

function rulerOf(surface: Element, progressOf: (id: string) => number | undefined): Ruler {
  const params = parameters(surface);
  const id = surface.getAttribute('data-sf-id') ?? '';
  const width = Number(surface.getAttribute('width'));
  const height = Number(surface.getAttribute('height'));
  const horizontal = params.axis === 'horizontal';
  const across = horizontal ? height : width;
  const dent = params.dent === undefined ? 1 : Number(params.dent);
  return {
    id,
    params,
    x: Number(surface.getAttribute('x')),
    y: Number(surface.getAttribute('y')),
    width,
    height,
    horizontal,
    progress: clamp01(progressOf(id) ?? Number(params.progress)),
    inset: positive(params.inset, 0.05),
    extent: horizontal ? width : height,
    across,
    depth: (dent < 0 ? 1 : dent) * 0.16 * across,
  };
}

// Lays the shape that the ruler names as its knob on the wire at the current value. Returns the half of the knob that lies across the
// ruler, as a share of the ruler, or nothing when there is no such shape.
function placeKnob(svg: SVGSVGElement, ruler: Ruler): number | undefined {
  const { params, x, y, width, height, horizontal, across, depth } = ruler;
  const knobId = typeof params.knob === 'string' ? params.knob : '';
  if (!knobId) {
    return undefined;
  }
  const nodes = [...svg.querySelectorAll(`[data-sf-id="${CSS.escape(knobId)}"]`)];
  const primary = nodes.find(node => node.hasAttribute('data-sf-primary')) as SVGGraphicsElement | undefined;
  if (!primary?.getBBox) {
    return undefined;
  }
  move(primary, 0, 0);
  const box = primary.getBBox();
  const half = (horizontal ? box.height : box.width) / 2;
  const along = ruler.inset + (1 - 2 * ruler.inset) * ruler.progress;
  const line = positive(params.line, 0.7);
  const gap = (params.gap === undefined ? 0.04 : Number(params.gap)) * across;
  const side = line * across - depth + half + gap;
  const target = horizontal ? { x: x + width * along, y: y + side } : { x: x + side, y: y + height * (1 - along) };
  const dx = target.x - (box.x + box.width / 2);
  const dy = target.y - (box.y + box.height / 2);
  for (const node of nodes) {
    move(node, dx, dy);
  }
  return half / across;
}

// The numbers near the knob are lifted out of the line and take the color of the light, the more the nearer they are.
function liftLabels(svg: SVGSVGElement, ruler: Ruler): void {
  const { id, params, horizontal, extent, inset, progress, depth } = ruler;
  const { min, max } = rangeOf(params);
  const peak = (typeof params.peak === 'string' ? parseHexRgb(params.peak) : null) ?? WHITE;
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

export function placeRulerKnobs(
  svg: SVGSVGElement,
  progressOf: (id: string) => number | undefined,
): Map<string, number> {
  const radii = new Map<string, number>();
  for (const surface of svg.querySelectorAll('foreignObject[data-sf-shader="ruler"]')) {
    const ruler = rulerOf(surface, progressOf);
    const radius = placeKnob(svg, ruler);
    if (radius !== undefined) {
      radii.set(ruler.id, radius);
    }
    liftLabels(svg, ruler);
  }
  return radii;
}
