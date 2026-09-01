import { resolveOwner } from '../contract';
import { findOwnerNode, isPrimary } from '../domQuery';
import type { Emitter } from '../events';
import { clickAction } from '../selection';
import { modifiersOf } from './modifiers';
import type { SelectionController } from './selectionController';

export function emitOwnerHover(event: PointerEvent, emitter: Emitter, diagramId: string): void {
  const owner = resolveOwner(event.target as Element | null);
  emitter.emit('ownerHover', owner ? { diagramId, owner, modifiers: modifiersOf(event) } : { diagramId, owner: null });
}

export function selectPointerTarget(
  event: PointerEvent,
  svg: SVGSVGElement,
  emitter: Emitter,
  diagramId: string,
  selection: SelectionController,
  isOverlayControl: (target: Element | null) => boolean,
): void {
  const target = event.target as Element | null;
  const owner = resolveOwner(target);
  if (!owner) {
    if (!isOverlayControl(target)) {
      selection.dispatch({ type: 'clear' });
    }
    return;
  }
  selection.remember(owner);
  const modifiers = modifiersOf(event);
  selection.dispatch(clickAction(owner.id, modifiers));
  emitter.emit(owner.role === 'link' ? 'linkClick' : 'entityClick', { diagramId, owner, modifiers });
  findOwnerNode(svg, owner.id, isPrimary)?.focus({ preventScroll: true });
}
