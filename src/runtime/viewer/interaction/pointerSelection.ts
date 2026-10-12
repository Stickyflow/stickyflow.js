import { findOwnerNode, isPrimary, resolveOwner } from '../../dom';
import type { Emitter, OwnerRef } from '../events';
import { modifiersOf } from './modifiers';
import { clickAction } from './selection';
import type { SelectionController } from './selectionController';

const SELECTION_OVERLAY_CONTROL_SELECTOR =
  '[data-sf-resize-handle], [data-sf-link-endpoint], [data-sf-quick-duplicate]';

export function isSelectionOverlayControl(target: Element | null): boolean {
  return Boolean(target?.closest(SELECTION_OVERLAY_CONTROL_SELECTOR));
}

export class OwnerPointerController {
  readonly #svg: SVGSVGElement;
  readonly #emitter: Emitter;
  readonly #diagramId: string;
  readonly #selection: SelectionController;

  constructor(svg: SVGSVGElement, emitter: Emitter, diagramId: string, selection: SelectionController) {
    this.#svg = svg;
    this.#emitter = emitter;
    this.#diagramId = diagramId;
    this.#selection = selection;
  }

  hover(event: PointerEvent): void {
    const owner = resolveOwner(event.target as Element | null);
    this.#emitter.emit(
      'ownerHover',
      owner
        ? { diagramId: this.#diagramId, owner, modifiers: modifiersOf(event) }
        : { diagramId: this.#diagramId, owner: null },
    );
  }

  select(event: PointerEvent): void {
    const target = event.target as Element | null;
    const owner = resolveOwner(target);
    if (!owner) {
      this.#clearWhenOutsideOverlay(target);
      return;
    }
    this.#selectOwner(owner, event);
  }

  #clearWhenOutsideOverlay(target: Element | null): void {
    if (!isSelectionOverlayControl(target)) {
      this.#selection.dispatch({ type: 'clear' });
    }
  }

  #selectOwner(owner: OwnerRef, event: PointerEvent): void {
    this.#selection.remember(owner);
    const modifiers = modifiersOf(event);
    this.#selection.dispatch(clickAction(owner.id, modifiers));
    this.#emitter.emit(owner.role === 'link' ? 'linkClick' : 'canvasObjectClick', {
      diagramId: this.#diagramId,
      owner,
      modifiers,
    });
    const node = findOwnerNode(this.#svg, owner.id, isPrimary);
    if (node && !node.hasAttribute('tabindex')) {
      node.setAttribute('tabindex', '-1');
    }
    node?.focus({ preventScroll: true });
  }
}
