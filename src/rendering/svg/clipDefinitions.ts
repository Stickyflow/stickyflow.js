import type { SceneStyle } from '../scene';
import { num, safeId, xml } from './format';

export class SvgClipDefinitions {
  private readonly ids = new Map<string, string>();

  constructor(
    private readonly addDefinition: (definition: string) => void,
    private readonly prefix: string,
  ) {}

  clip(style: SceneStyle): string | undefined {
    if (!style.clip) {
      return undefined;
    }

    const key = JSON.stringify(style.clip);
    let id = this.ids.get(key);
    if (!id) {
      id = safeId(`${this.prefix}clip-${this.ids.size}`);
      this.ids.set(key, id);
      const clip = style.clip;
      const shape =
        clip.type === 'path'
          ? `<path clip-rule="evenodd" d="${xml(clip.d)}"/>`
          : `<rect x="${num(clip.x)}" y="${num(clip.y)}" width="${num(clip.width)}" height="${num(clip.height)}" rx="${num(clip.rx)}"/>`;
      this.addDefinition(`<clipPath id="${id}">${shape}</clipPath>`);
    }
    return id;
  }
}
