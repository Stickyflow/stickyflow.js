import type { SceneStyle } from '../../renderScene/scene';
import { num, safeId, xml } from './format';

export class SvgFilterDefinitions {
  private readonly ids = new Map<string, string>();

  constructor(
    private readonly addDefinition: (definition: string) => void,
    private readonly prefix: string,
  ) {}

  filter(style: SceneStyle, nodeId: string): string | undefined {
    if (style.innerShadow) {
      return this.define(nodeId, style.innerShadow, innerShadowPrimitives);
    }
    if (style.shadow) {
      return this.define(nodeId, style.shadow, outerShadowPrimitives);
    }
    return undefined;
  }

  private define(
    nodeId: string,
    shadow: NonNullable<SceneStyle['shadow']>,
    primitives: (shadow: NonNullable<SceneStyle['shadow']>) => string,
  ): string {
    const key = JSON.stringify(shadow) + primitives.name;
    let id = this.ids.get(key);
    if (!id) {
      id = safeId(`${this.prefix}shadow-${nodeId}-${this.ids.size}`);
      this.ids.set(key, id);
      this.addDefinition(
        `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${primitives(shadow)}</filter>`,
      );
    }
    return id;
  }
}

function outerShadowPrimitives(shadow: NonNullable<SceneStyle['shadow']>): string {
  return `<feDropShadow dx="${num(shadow.dx)}" dy="${num(shadow.dy)}" stdDeviation="${num(shadow.blur / 2)}" flood-color="${xml(shadow.color)}" flood-opacity="${num(shadow.opacity)}"/>`;
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
