import type { MarkerType } from '../../model/links';
import type { RenderNode, ScenePaint, SceneStyle } from '../renderScene';
import { num, safeId, xml } from './format';

export class SvgDefinitionRegistry {
  entries: string[] = [];
  private paints = new Map<string, string>();
  private filters = new Map<string, string>();
  private markers = new Map<string, string>();

  constructor(private readonly prefix: string) {}

  elementId(id: string): string {
    return safeId(`${this.prefix}${id}`);
  }

  paint(value: ScenePaint | undefined, nodeId: string, bounds: RenderNode['bounds']): string {
    if (!value || value.kind === 'none') {
      return 'none';
    }
    if (value.kind === 'solid') {
      return value.color;
    }
    const key = JSON.stringify(value) + JSON.stringify(bounds);
    let id = this.paints.get(key);
    if (!id) {
      id = safeId(`${this.prefix}gradient-${nodeId}-${this.paints.size}`);
      this.paints.set(key, id);
      if (value.kind === 'mesh-gradient') {
        const radialIds = value.points.map((_point, index) => safeId(`${id}-point-${index}`));
        const radialDefs = value.points
          .map((point, index) => {
            const cx = Math.max(0, Math.min(100, point.x));
            const cy = Math.max(0, Math.min(100, point.y));
            return `<radialGradient id="${radialIds[index]}" gradientUnits="objectBoundingBox" cx="${num(cx)}%" cy="${num(cy)}%" r="75%"><stop offset="0%" stop-color="${xml(point.color)}" stop-opacity="1"/><stop offset="100%" stop-color="${xml(point.color)}" stop-opacity="0"/></radialGradient>`;
          })
          .join('');
        const layers = value.points
          .map((_, index) => `<rect width="1" height="1" fill="url(#${radialIds[index]})"/>`)
          .join('');
        this.entries.push(
          `${radialDefs}<pattern id="${id}" patternUnits="objectBoundingBox" patternContentUnits="objectBoundingBox" width="1" height="1"><rect width="1" height="1" fill="${xml(value.points[0]?.color ?? 'transparent')}"/>${layers}</pattern>`,
        );
        return `url(#${id})`;
      }
      const angle = (value.angle * Math.PI) / 180,
        cx = (bounds.minX + bounds.maxX) / 2,
        cy = (bounds.minY + bounds.maxY) / 2;
      const radius = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2;
      const dx = Math.cos(angle) * radius,
        dy = Math.sin(angle) * radius;
      this.entries.push(
        `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(cx - dx)}" y1="${num(cy - dy)}" x2="${num(cx + dx)}" y2="${num(cy + dy)}">${value.stops.map(s => `<stop offset="${num(Math.max(0, Math.min(100, s.offset)))}%" stop-color="${xml(s.color)}"/>`).join('')}</linearGradient>`,
      );
    }
    return `url(#${id})`;
  }

  filter(style: SceneStyle, nodeId: string): string | undefined {
    if (!style.shadow) {
      return undefined;
    }
    const key = JSON.stringify(style.shadow);
    let id = this.filters.get(key);
    if (!id) {
      id = safeId(`${this.prefix}shadow-${nodeId}-${this.filters.size}`);
      this.filters.set(key, id);
      const s = style.shadow;
      this.entries.push(
        `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${num(s.dx)}" dy="${num(s.dy)}" stdDeviation="${num(s.blur / 2)}" flood-color="${xml(s.color)}" flood-opacity="${num(s.opacity)}"/></filter>`,
      );
    }
    return id;
  }

  marker(type: MarkerType | undefined, color: string, strokeWidth: number): string | undefined {
    if (!type || type === 'none') {
      return undefined;
    }
    const key = `${type}:${color}:${strokeWidth}`;
    let id = this.markers.get(key);
    if (id) {
      return id;
    }
    id = safeId(`${this.prefix}marker-${type}-${this.markers.size}`);
    this.markers.set(key, id);
    const size = 12 + (strokeWidth - 2) * 3;
    const compoundErMarker = type === 'one_many' || type === 'zero_many';
    const extent = Math.max(size * (compoundErMarker ? 2 : 1.4), strokeWidth * 2);
    const common = `id="${id}" markerWidth="${num(extent * 2)}" markerHeight="${num(extent * 2)}" viewBox="${num(-extent)} ${num(-extent)} ${num(extent * 2)} ${num(extent * 2)}" refX="0" refY="0" orient="auto-start-reverse" markerUnits="userSpaceOnUse" overflow="visible"`;
    const c = xml(color);
    const body: Record<Exclude<MarkerType, 'none'>, string> = {
      arrow: `<path d="M ${num(-size)} ${num(-size * 0.6)} L 0 0 L ${num(-size)} ${num(size * 0.6)}" fill="none" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"/>`,
      filled_arrow: `<path d="M ${num(-size)} ${num(-size * 0.6)} L 0 0 L ${num(-size)} ${num(size * 0.6)} Z" fill="${c}" stroke="${c}" stroke-width="${num(strokeWidth * 0.5)}" stroke-linejoin="round"/>`,
      circle: `<circle cx="0" cy="0" r="${num(size * 0.5)}" fill="white" stroke="${c}" stroke-width="${num(strokeWidth)}"/>`,
      filled_circle: `<circle cx="0" cy="0" r="${num(size * 0.5)}" fill="${c}"/>`,
      diamond: `<path d="M ${num(-size * 0.6)} 0 L 0 ${num(-size * 0.6)} L ${num(size * 0.6)} 0 L 0 ${num(size * 0.6)} Z" fill="white" stroke="${c}" stroke-width="${num(strokeWidth)}"/>`,
      filled_diamond: `<path d="M ${num(-size * 0.6)} 0 L 0 ${num(-size * 0.6)} L ${num(size * 0.6)} 0 L 0 ${num(size * 0.6)} Z" fill="${c}" stroke="${c}" stroke-width="${num(strokeWidth * 0.5)}"/>`,
      bar: `<path d="M 0 ${num(-size * 0.6)} V ${num(size * 0.6)}" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
      triangle: `<path d="M ${num(-size)} ${num(-size * 0.72)} L 0 0 L ${num(-size)} ${num(size * 0.72)} Z" fill="white" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linejoin="round"/>`,
      one: `<path d="M 0 ${num(-size * 0.62)} V ${num(size * 0.62)} M ${num(-size * 0.72)} ${num(-size * 0.62)} V ${num(size * 0.62)}" stroke="${c}" stroke-width="${num(strokeWidth)}"/>`,
      zero_one: `<circle cx="${num(-size * 0.8)}" cy="0" r="${num(size * 0.38)}" fill="white" stroke="${c}" stroke-width="${num(strokeWidth)}"/><path d="M 0 ${num(-size * 0.62)} V ${num(size * 0.62)}" stroke="${c}" stroke-width="${num(strokeWidth)}"/>`,
      many: `<path d="M ${num(-size)} ${num(-size * 0.72)} L 0 0 M ${num(-size)} 0 L 0 0 M ${num(-size)} ${num(size * 0.72)} L 0 0" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
      one_many: `<path d="M ${num(-size)} ${num(-size * 0.72)} L 0 0 M ${num(-size)} 0 L 0 0 M ${num(-size)} ${num(size * 0.72)} L 0 0 M ${num(-size * 1.45)} ${num(-size * 0.62)} V ${num(size * 0.62)}" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
      zero_many: `<circle cx="${num(-size * 1.45)}" cy="0" r="${num(size * 0.38)}" fill="white" stroke="${c}" stroke-width="${num(strokeWidth)}"/><path d="M ${num(-size)} ${num(-size * 0.72)} L 0 0 M ${num(-size)} 0 L 0 0 M ${num(-size)} ${num(size * 0.72)} L 0 0" stroke="${c}" stroke-width="${num(strokeWidth)}" stroke-linecap="round"/>`,
    };
    this.entries.push(`<marker ${common}>${body[type]}</marker>`);
    return id;
  }
}
