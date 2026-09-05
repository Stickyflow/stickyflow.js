import type { Emitter } from '../events';
import type { EditableRules } from '../propertyEdit/editable';
import { openColorPicker, seedColor } from './picker';
import { resolveColorEditTarget } from './target';

export class ColorEditSession {
  readonly #emitter: Emitter;
  readonly #rules: EditableRules | undefined;

  constructor(emitter: Emitter, rules: EditableRules | undefined) {
    this.#emitter = emitter;
    this.#rules = rules;
  }

  readonly click = (event: MouseEvent): void => {
    const target = resolveColorEditTarget(event, this.#rules);
    if (!target) {
      return;
    }
    event.stopPropagation();
    openColorPicker(seedColor(target.node), color => {
      this.#emitter.emit('propertyChange', { owner: target.owner, path: target.path, value: color });
    });
  };
}
