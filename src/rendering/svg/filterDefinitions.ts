import type { SceneStyle } from '../scene';
import { num, safeId, xml } from './format';

export class SvgFilterDefinitions {
  private readonly ids = new Map<string, string>();

  constructor(
    private readonly addDefinition: (definition: string) => void,
    private readonly prefix: string,
  ) {}

  filter(style: SceneStyle, nodeId: string): string | undefined {
    if (!style.shadow) {
      return undefined;
    }

    const key = JSON.stringify(style.shadow);
    let id = this.ids.get(key);
    if (!id) {
      id = safeId(`${this.prefix}shadow-${nodeId}-${this.ids.size}`);
      this.ids.set(key, id);
      const shadow = style.shadow;
      this.addDefinition(
        `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${num(shadow.dx)}" dy="${num(shadow.dy)}" stdDeviation="${num(shadow.blur / 2)}" flood-color="${xml(shadow.color)}" flood-opacity="${num(shadow.opacity)}"/></filter>`,
      );
    }
    return id;
  }
}
