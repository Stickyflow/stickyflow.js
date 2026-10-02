import type { RenderNode, ScenePaint } from '../renderScene/scene';
import { num, safeId, xml } from './format';

type GradientPaint = Exclude<ScenePaint, { kind: 'none' } | { kind: 'solid' }>;

function meshGradientDefinition(id: string, paint: Extract<GradientPaint, { kind: 'mesh-gradient' }>): string {
  const radialIds = paint.points.map((_point, index) => safeId(`${id}-point-${index}`));
  const radialDefinitions = paint.points
    .map((point, index) => {
      const centerX = Math.max(0, Math.min(100, point.x));
      const centerY = Math.max(0, Math.min(100, point.y));
      return `<radialGradient id="${radialIds[index]}" gradientUnits="objectBoundingBox" cx="${num(centerX)}%" cy="${num(centerY)}%" r="75%"><stop offset="0%" stop-color="${xml(point.color)}" stop-opacity="1"/><stop offset="100%" stop-color="${xml(point.color)}" stop-opacity="0"/></radialGradient>`;
    })
    .join('');
  const layers = paint.points
    .map((_point, index) => `<rect width="1" height="1" fill="url(#${radialIds[index]})"/>`)
    .join('');
  return `${radialDefinitions}<pattern id="${id}" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1"><rect width="1" height="1" fill="${xml(paint.points[0]?.color ?? 'transparent')}"/>${layers}</pattern>`;
}

function linearGradientDefinition(
  id: string,
  paint: Extract<GradientPaint, { kind: 'linear-gradient' }>,
  bounds: RenderNode['bounds'],
): string {
  const angle = (paint.angle * Math.PI) / 180;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const radius = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2;
  const deltaX = Math.cos(angle) * radius;
  const deltaY = Math.sin(angle) * radius;
  const stops = paint.stops
    .map(stop => `<stop offset="${num(Math.max(0, Math.min(100, stop.offset)))}%" stop-color="${xml(stop.color)}"/>`)
    .join('');
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(centerX - deltaX)}" y1="${num(centerY - deltaY)}" x2="${num(centerX + deltaX)}" y2="${num(centerY + deltaY)}">${stops}</linearGradient>`;
}

export class SvgPaintDefinitions {
  private readonly ids = new Map<string, string>();

  constructor(
    private readonly addDefinition: (definition: string) => void,
    private readonly prefix: string,
  ) {}

  paint(value: ScenePaint | undefined, nodeId: string, bounds: RenderNode['bounds']): string {
    if (!value || value.kind === 'none') {
      return 'none';
    }
    if (value.kind === 'solid') {
      return value.color;
    }

    const key = JSON.stringify(value) + JSON.stringify(bounds);
    let id = this.ids.get(key);
    if (!id) {
      id = safeId(`${this.prefix}gradient-${nodeId}-${this.ids.size}`);
      this.ids.set(key, id);
      const definition =
        value.kind === 'mesh-gradient'
          ? meshGradientDefinition(id, value)
          : linearGradientDefinition(id, value, bounds);
      this.addDefinition(definition);
    }
    return `url(#${id})`;
  }
}
