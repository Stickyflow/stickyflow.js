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

// The progress (0 to 1) of a ruler for a value; the knob and the shader both follow it.
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

function hexToRgb(value: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const number = parseInt(match[1], 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

// The numbers give way and turn white around the knob, like the ticks do in the shader.
function shade(node: SVGElement, bump: number): void {
  const base = fills.get(node) ?? node.getAttribute('fill') ?? '';
  fills.set(node, base);
  const rgb = hexToRgb(base);
  if (!rgb) return;
  const mixed = rgb.map(channel => Math.round(channel + (255 - channel) * bump));
  const fill = `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
  node.style.fill = fill;
  for (const child of node.querySelectorAll<SVGElement>('tspan')) {
    child.style.fill = fill;
  }
}

// A ruler with a knob names a Shape of the document; the viewer lays that Shape beside the wire at the current value and
// moves the numbers out of its way.
export function placeRulerKnobs(svg: SVGSVGElement, progressOf: (id: string) => number | undefined): void {
  for (const surface of svg.querySelectorAll('foreignObject[data-sf-shader="ruler"]')) {
    const params = parameters(surface);
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
        const gap = (params.gap === undefined ? 0.04 : Number(params.gap)) * across;
        const side = line * across - depth + half + gap;
        const target = horizontal
          ? { x: x + width * along, y: y + side }
          : { x: x + side, y: y + height * (1 - along) };
        const dx = target.x - (box.x + box.width / 2);
        const dy = target.y - (box.y + box.height / 2);
        for (const node of nodes) move(node, dx, dy);
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
      if (!Number.isFinite(value) || max === min) continue;
      const labelAt = start + span * clamp01((value - min) / (max - min));
      const bump = Math.exp(-(((labelAt - knobAt) / spread) ** 2));
      const shift = depth * 0.4 * bump;
      move(label, horizontal ? 0 : -shift, horizontal ? -shift : 0);
      shade(label, bump);
    }
  }
}
