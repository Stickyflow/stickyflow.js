import { normalizeHex } from './color';
import { clampPosition, DEFAULT_GRADIENT_ANGLE, type GradientStopValue, type GradientValue } from './gradientValue';

function readAngle(def: Element): number {
  const coordinates = ['x1', 'y1', 'x2', 'y2'].map(name => Number.parseFloat(def.getAttribute(name) ?? ''));
  if (!coordinates.every(Number.isFinite)) {
    return DEFAULT_GRADIENT_ANGLE;
  }
  const [x1, y1, x2, y2] = coordinates;
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return Number(angle.toFixed(1));
}

export function readGradientValue(svg: SVGSVGElement, fill: string | null): GradientValue | null {
  const id = fill?.match(/^url\(#([^)]+)\)$/)?.[1];
  if (!id) {
    return null;
  }
  const def = svg.querySelector(`[id="${CSS.escape(id)}"]`);
  if (def?.tagName.toLowerCase() !== 'lineargradient') {
    return null;
  }

  const stops: GradientStopValue[] = [];
  for (const stop of def.querySelectorAll('stop')) {
    const color = normalizeHex(stop.getAttribute('stop-color') ?? '');
    const offset = Number.parseFloat(stop.getAttribute('offset') ?? '');
    if (color && Number.isFinite(offset)) {
      stops.push({ color, position: clampPosition(offset) });
    }
  }
  if (stops.length < 2) {
    return null;
  }
  return { angle: readAngle(def), stops };
}
