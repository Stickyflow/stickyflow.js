import type { SceneClip, SceneStyle } from '../renderScene/scene';
import { num, safeId, xml } from './format';

export class SvgClipDefinitions {
  private readonly ids = new Map<string, string>();

  constructor(
    private readonly addDefinition: (definition: string) => void,
    private readonly prefix: string,
  ) {}

  clip(style: SceneStyle): string | undefined {
    return style.clip ? this.define(style.clip) : undefined;
  }

  private define(clip: SceneClip): string {
    const key = JSON.stringify(clip);
    let id = this.ids.get(key);
    if (!id) {
      const outer = clip.within ? this.define(clip.within) : undefined;
      id = safeId(`${this.prefix}clip-${this.ids.size}`);
      this.ids.set(key, id);
      const shape =
        clip.type === 'path'
          ? `<path clip-rule="evenodd" d="${xml(clip.d)}"/>`
          : `<rect x="${num(clip.x)}" y="${num(clip.y)}" width="${num(clip.width)}" height="${num(clip.height)}" rx="${num(clip.rx)}"/>`;
      this.addDefinition(`<clipPath id="${id}"${outer ? ` clip-path="url(#${outer})"` : ''}>${shape}</clipPath>`);
    }
    return id;
  }
}
