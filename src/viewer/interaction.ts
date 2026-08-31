import { isCameraGesture, resolveOwner } from './contract';
import type { DisplayHandle } from './display';
import { findOwnerNode, isPrimary } from './domQuery';
import type { Emitter, OwnerRef } from './events';
import { clickAction, selectionReducer } from './selection';
import { linkSelectionOverlay, quickDuplicateBubbles, shapeSelectionOverlay } from './selectionOverlay';

export interface InteractionHandle {
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  destroy(): void;
}

const DRAG_THRESHOLD = 4;

export interface BindInteractionOptions {
  selectable?: boolean;
}

export function bindInteraction(
  display: DisplayHandle,
  emitter: Emitter,
  diagramId: string,
  options: BindInteractionOptions = {},
): InteractionHandle {
  const selectable = options.selectable ?? true;
  const svg = display.svg;
  let selection = new Set<string>();
  const owners = new Map<string, OwnerRef>();

  const paintSelection = () => {
    svg.querySelectorAll('[data-sf-selection-overlay]').forEach(el => {
      el.remove();
    });
    const doc = svg.ownerDocument;
    selection.forEach(id => {
      const primary = findOwnerNode(svg, id, isPrimary);
      if (!primary) return;
      const owner = owners.get(id);
      const overlay =
        owner?.role === 'link'
          ? linkSelectionOverlay(doc, primary as unknown as SVGPathElement, id)
          : shapeSelectionOverlay(doc, primary, id);
      svg.appendChild(overlay);
      if (owner?.role === 'entity' && selection.size === 1) {
        svg.appendChild(quickDuplicateBubbles(doc, primary, id));
      }
    });
  };

  const setSelection = (next: Set<string>) => {
    selection = next;
    paintSelection();
    emitter.emit('selectionChange', {
      diagramId,
      selection: [...selection].map(id => owners.get(id)).filter((o): o is OwnerRef => !!o),
    });
  };

  const modifiersOf = (e: MouseEvent | KeyboardEvent) => ({
    shift: e.shiftKey,
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    alt: e.altKey,
  });

  let down: { x: number; y: number; moved: boolean; panable: boolean } | null = null;

  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as Element | null;
    const overContent =
      !!resolveOwner(target) ||
      !!target?.closest('[data-sf-resize-handle], [data-sf-link-endpoint], [data-sf-quick-duplicate]');
    down = { x: e.clientX, y: e.clientY, moved: false, panable: isCameraGesture(e) || !overContent };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (down) {
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_THRESHOLD) down.moved = true;
      if (down.moved) {
        if (down.panable && isCameraGesture(e)) display.panBy(e.movementX, e.movementY);
        return;
      }
    }
    if (!selectable) return;
    const owner = resolveOwner(e.target as Element | null);
    emitter.emit('ownerHover', owner ? { diagramId, owner, modifiers: modifiersOf(e) } : { diagramId, owner: null });
  };

  const onPointerUp = (e: PointerEvent) => {
    const wasDrag = down?.moved ?? false;
    down = null;
    if (wasDrag || !selectable) return;
    const target = e.target as Element | null;
    const owner = resolveOwner(target);
    if (!owner) {
      if (!target?.closest('[data-sf-resize-handle], [data-sf-link-endpoint], [data-sf-quick-duplicate]'))
        setSelection(selectionReducer(selection, { type: 'clear' }));
      return;
    }
    owners.set(owner.id, owner);
    setSelection(selectionReducer(selection, clickAction(owner.id, modifiersOf(e))));
    emitter.emit(owner.role === 'link' ? 'linkClick' : 'entityClick', { diagramId, owner, modifiers: modifiersOf(e) });
    findOwnerNode(svg, owner.id, isPrimary)?.focus({ preventScroll: true });
  };

  const onWheel = (e: WheelEvent) => {
    if (!isCameraGesture(e)) return;
    e.preventDefault();
    display.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (selectable && e.key === 'Escape') setSelection(selectionReducer(selection, { type: 'clear' }));
  };

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('keydown', onKeyDown);

  return {
    getSelection: () => [...selection].map(id => owners.get(id)).filter((o): o is OwnerRef => !!o),
    select(ids) {
      ids.forEach(id => {
        const el = svg.querySelector(`[data-sf-id="${CSS.escape(id)}"]`);
        if (el) owners.set(id, resolveOwner(el)!);
      });
      setSelection(selectionReducer(selection, { type: 'set', ids }));
    },
    destroy() {
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('keydown', onKeyDown);
    },
  };
}
