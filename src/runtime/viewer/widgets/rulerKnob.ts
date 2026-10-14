const bases = new WeakMap<Element, string>();
const written = new WeakMap<Element, string>();

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

// A ruler with a knob names a Shape of the document; the viewer lays that Shape on the wire at the current value.
export function placeRulerKnobs(svg: SVGSVGElement, progressOf: (id: string) => number | undefined): void {
  for (const surface of svg.querySelectorAll('foreignObject[data-sf-shader="ruler"]')) {
    const params = parameters(surface);
    const knobId = typeof params.knob === 'string' ? params.knob : '';
    if (!knobId) continue;
    const nodes = [...svg.querySelectorAll(`[data-sf-id="${CSS.escape(knobId)}"]`)];
    const primary = nodes.find((node) => node.hasAttribute('data-sf-primary')) as SVGGraphicsElement | undefined;
    if (!primary?.getBBox) continue;

    const x = Number(surface.getAttribute('x'));
    const y = Number(surface.getAttribute('y'));
    const width = Number(surface.getAttribute('width'));
    const height = Number(surface.getAttribute('height'));
    const progress = clamp01(progressOf(surface.getAttribute('data-sf-id') ?? '') ?? Number(params.progress));
    const inset = Number(params.inset) > 0 ? Number(params.inset) : 0.05;
    const line = Number(params.line) > 0 ? Number(params.line) : 0.7;
    const along = inset + (1 - 2 * inset) * progress;
    const target =
      params.axis === 'horizontal' ? { x: x + width * along, y: y + height * line } : { x: x + width * line, y: y + height * (1 - along) };

    move(primary, 0, 0);
    const box = primary.getBBox();
    const dx = target.x - (box.x + box.width / 2);
    const dy = target.y - (box.y + box.height / 2);
    for (const node of nodes) move(node, dx, dy);
  }
}
