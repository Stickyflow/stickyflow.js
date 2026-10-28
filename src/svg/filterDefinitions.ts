import type { SceneStyle } from '../renderScene/scene';
import { num, safeId, xml } from './format';

export class SvgFilterDefinitions {
  private readonly ids = new Map<string, string>();

  constructor(
    private readonly addDefinition: (definition: string) => void,
    private readonly prefix: string,
  ) {}

  filter(style: SceneStyle, nodeId: string, size?: number): string | undefined {
    if (style.innerShadow) {
      return this.define(nodeId, style.innerShadow, innerShadowPrimitives);
    }
    if (style.shadow) {
      const reach = style.shadow.blur * 1.5 + Math.max(Math.abs(style.shadow.dx), Math.abs(style.shadow.dy));
      return this.define(
        nodeId,
        style.shadow,
        outerShadowPrimitives,
        size && size > 0 ? Math.max(0.5, reach / size) : 0.5,
      );
    }
    if (style.blur || style.saturate !== undefined) {
      const margin = size && size > 0 && style.blur ? Math.max(0.5, (style.blur * 1.5) / size) : 0.5;
      return this.define(nodeId, { blur: style.blur ?? 0, saturate: style.saturate ?? 1 }, blurPrimitives, margin);
    }
    return undefined;
  }

  private define<T>(nodeId: string, value: T, primitives: (value: T) => string, margin = 0.5): string {
    const key = JSON.stringify(value) + primitives.name + margin;
    let id = this.ids.get(key);
    if (!id) {
      id = safeId(`${this.prefix}shadow-${nodeId}-${this.ids.size}`);
      this.ids.set(key, id);
      this.addDefinition(
        `<filter id="${id}" x="${num(-margin * 100)}%" y="${num(-margin * 100)}%" width="${num((1 + margin * 2) * 100)}%" height="${num((1 + margin * 2) * 100)}%">${primitives(value)}</filter>`,
      );
    }
    return id;
  }
}

function outerShadowPrimitives(shadow: NonNullable<SceneStyle['shadow']>): string {
  return `<feDropShadow dx="${num(shadow.dx)}" dy="${num(shadow.dy)}" stdDeviation="${num(shadow.blur / 2)}" flood-color="${xml(shadow.color)}" flood-opacity="${num(shadow.opacity)}"/>`;
}

function blurPrimitives(effect: { blur: number; saturate: number }): string {
  const blur = effect.blur > 0 ? `<feGaussianBlur stdDeviation="${num(effect.blur / 2)}"/>` : '';
  const saturate = effect.saturate === 1 ? '' : `<feColorMatrix type="saturate" values="${num(effect.saturate)}"/>`;
  return blur + saturate;
}

function innerShadowPrimitives(shadow: NonNullable<SceneStyle['shadow']>): string {
  return [
    '<feComponentTransfer in="SourceAlpha" result="sf-inverted-alpha">',
    '<feFuncA type="table" tableValues="1 0"/>',
    '</feComponentTransfer>',
    `<feGaussianBlur in="sf-inverted-alpha" stdDeviation="${num(shadow.blur / 2)}" result="sf-blurred"/>`,
    `<feOffset in="sf-blurred" dx="${num(shadow.dx)}" dy="${num(shadow.dy)}" result="sf-offset"/>`,
    `<feFlood flood-color="${xml(shadow.color)}" flood-opacity="${num(shadow.opacity)}" result="sf-color"/>`,
    '<feComposite in="sf-color" in2="sf-offset" operator="in" result="sf-halo"/>',
    '<feComposite in="sf-halo" in2="SourceGraphic" operator="in" result="sf-inset"/>',
    '<feComposite in="sf-inset" in2="SourceGraphic" operator="over"/>',
  ].join('');
}
