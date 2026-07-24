// INTERACTION layer: wires DOM input events on top of the static display, using
// the pure contract/selection/event helpers. This is the only place with event
// listeners; display.ts stays a listener-free camera. (DOM code — verify in a
// browser.) Model mutation (tier 2b) will attach here later as applyOp().
import type { DisplayHandle } from './display';
import { resolveOwner } from './contract';
import { selectionReducer, clickAction } from './selection';
import { Emitter, type OwnerRef } from './events';

export interface InteractionHandle {
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  destroy(): void;
}

const DRAG_THRESHOLD = 4;

export function bindInteraction(display: DisplayHandle, emitter: Emitter, diagramId: string): InteractionHandle {
  const svg = display.svg;
  let selection = new Set<string>();
  const owners = new Map<string, OwnerRef>();

  const paintSelection = () => {
    // Only the primary node per owner (data-sf-primary — see buildRenderScene's
    // tag()) gets the selection attribute, not every sub-node sharing the
    // owner's sfId. Painting all of them applied the selection style (a
    // stroke override, see SflDiagram.css) to text labels too — glyphs aren't
    // meant to be stroked, so a selected entity's own label rendered as a
    // disfigured blob instead of a clean highlight on the shape itself.
    svg.querySelectorAll('[data-sf-selected]').forEach(el => el.removeAttribute('data-sf-selected'));
    selection.forEach(id => svg.querySelectorAll(`[data-sf-id="${CSS.escape(id)}"][data-sf-primary]`)
      .forEach(el => el.setAttribute('data-sf-selected', 'true')));
  };

  const setSelection = (next: Set<string>) => {
    selection = next;
    paintSelection();
    emitter.emit('selectionChange', {
      diagramId,
      selection: [...selection].map(id => owners.get(id)).filter((o): o is OwnerRef => !!o),
    });
  };

  const modifiersOf = (e: MouseEvent | KeyboardEvent) => ({ shift: e.shiftKey, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey });

  // --- selection + click ---------------------------------------------------
  let down: { x: number; y: number; moved: boolean } | null = null;

  const onPointerDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, moved: false }; };

  const onPointerMove = (e: PointerEvent) => {
    if (down) {
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_THRESHOLD) down.moved = true;
      if (down.moved) { display.panBy(e.movementX, e.movementY); return; }
    }
    const owner = resolveOwner(e.target as Element | null);
    emitter.emit('ownerHover', owner ? { diagramId, owner, modifiers: modifiersOf(e) } : { diagramId, owner: null });
  };

  const onPointerUp = (e: PointerEvent) => {
    const wasDrag = down?.moved ?? false;
    down = null;
    if (wasDrag) return;
    const owner = resolveOwner(e.target as Element | null);
    if (!owner) { setSelection(selectionReducer(selection, { type: 'clear' })); return; }
    owners.set(owner.id, owner);
    setSelection(selectionReducer(selection, clickAction(owner.id, modifiersOf(e))));
    emitter.emit(owner.role === 'link' ? 'linkClick' : 'entityClick', { diagramId, owner, modifiers: modifiersOf(e) });
  };

  // --- wheel zoom ----------------------------------------------------------
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    display.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY);
  };

  // --- keyboard ------------------------------------------------------------
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setSelection(selectionReducer(selection, { type: 'clear' }));
  };

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('keydown', onKeyDown);

  return {
    getSelection: () => [...selection].map(id => owners.get(id)).filter((o): o is OwnerRef => !!o),
    select(ids) {
      ids.forEach(id => { const el = svg.querySelector(`[data-sf-id="${CSS.escape(id)}"]`); if (el) owners.set(id, resolveOwner(el)!); });
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
