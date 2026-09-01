import type { MarkerType } from '../../model/links';
import { num, safeId, xml } from './format';
import { markerBody } from './markerBodies';

function markerExtent(type: Exclude<MarkerType, 'none'>, size: number, strokeWidth: number): number {
  const isCompoundErMarker = type === 'one_many' || type === 'zero_many';
  return Math.max(size * (isCompoundErMarker ? 2 : 1.4), strokeWidth * 2);
}

function markerAttributes(id: string, extent: number): string {
  return `id="${id}" markerWidth="${num(extent * 2)}" markerHeight="${num(extent * 2)}" viewBox="${num(-extent)} ${num(-extent)} ${num(extent * 2)} ${num(extent * 2)}" refX="0" refY="0" orient="auto-start-reverse" markerUnits="userSpaceOnUse" overflow="visible"`;
}

export class SvgMarkerDefinitions {
  private readonly ids = new Map<string, string>();

  constructor(
    private readonly addDefinition: (definition: string) => void,
    private readonly prefix: string,
  ) {}

  marker(type: MarkerType | undefined, color: string, strokeWidth: number): string | undefined {
    if (!type || type === 'none') {
      return undefined;
    }

    const key = `${type}:${color}:${strokeWidth}`;
    let id = this.ids.get(key);
    if (id) {
      return id;
    }

    id = safeId(`${this.prefix}marker-${type}-${this.ids.size}`);
    this.ids.set(key, id);
    const size = 12 + (strokeWidth - 2) * 3;
    const extent = markerExtent(type, size, strokeWidth);
    const attributes = markerAttributes(id, extent);
    this.addDefinition(`<marker ${attributes}>${markerBody(type, size, xml(color), strokeWidth)}</marker>`);
    return id;
  }
}
