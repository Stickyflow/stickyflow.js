import type { OwnerRef } from '../../viewer';
import type { Emitter } from '../events';
import type { ActiveTextEditor } from './activeEditor';
import { createActiveTextEditor } from './editorFactory';
import { resolveEditableTextOwner } from './target';

export class TextEditingSession {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  #activeEditor: ActiveTextEditor | null = null;

  constructor(svg: SVGSVGElement, emitter: Emitter) {
    this.#svg = svg;
    this.#emitter = emitter;
  }

  readonly doubleClick = (event: MouseEvent): void => {
    const owner = resolveEditableTextOwner(event);
    if (owner) {
      this.begin(owner);
    }
  };

  cancel(): void {
    this.#activeEditor?.cancel();
  }

  private begin(owner: OwnerRef): void {
    this.cancel();
    this.#activeEditor = createActiveTextEditor(this.#svg, owner, this.#emitter, () => {
      this.#activeEditor = null;
    });
  }
}
