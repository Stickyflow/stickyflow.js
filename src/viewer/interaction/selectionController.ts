import { resolveOwner } from '../../domContract';
import type { Emitter, OwnerRef } from '../events';
import { type SelectionAction, selectionReducer } from '../selection';
import { paintSelectionOverlays } from './overlayPainter';

export class SelectionController {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  readonly #diagramId: string;
  readonly #owners = new Map<string, OwnerRef>();
  #ids = new Set<string>();

  constructor(svg: SVGSVGElement, emitter: Emitter, diagramId: string) {
    this.#svg = svg;
    this.#emitter = emitter;
    this.#diagramId = diagramId;
  }

  getOwners(): OwnerRef[] {
    return [...this.#ids].map(id => this.#owners.get(id)).filter((owner): owner is OwnerRef => Boolean(owner));
  }

  remember(owner: OwnerRef): void {
    this.#owners.set(owner.id, owner);
  }

  dispatch(action: SelectionAction): void {
    this.#ids = selectionReducer(this.#ids, action);
    paintSelectionOverlays(this.#svg, this.#ids, this.#owners);
    this.#emitter.emit('selectionChange', {
      diagramId: this.#diagramId,
      selection: this.getOwners(),
    });
  }

  selectIds(ids: string[]): void {
    for (const id of ids) {
      const element = this.#svg.querySelector(`[data-sf-id="${CSS.escape(id)}"]`);
      const owner = resolveOwner(element);
      if (owner) {
        this.remember(owner);
      }
    }
    this.dispatch({ type: 'set', ids });
  }
}
