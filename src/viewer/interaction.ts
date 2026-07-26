// INTERACTION layer: wires DOM input events on top of the static display, using
// the pure contract/selection/event helpers. This is the only place with event
// listeners; display.ts stays a listener-free camera. (DOM code — verify in a
// browser.) Read-only tier: selection/hover/pan/zoom plus the selection's own
// visual indicator. Mutating interactions (text edit, future drag) live in the
// separate `stickyflow/interaction` package instead — see src/interaction/.
import type { DisplayHandle } from './display';
import { resolveOwner } from './contract';
import { selectionReducer, clickAction } from './selection';
import { Emitter, type OwnerRef } from './events';
import { findOwnerNode, isPrimary } from './domQuery';
import { shapeSelectionOverlay, linkSelectionOverlay } from './selectionOverlay';

export interface InteractionHandle {
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  destroy(): void;
}

const DRAG_THRESHOLD = 4;

export interface BindInteractionOptions {
  /** Click-to-select and hover events. Default true. Pan/zoom stay on either
   *  way — set false for a navigation-only viewer with nothing to select. */
  selectable?: boolean;
}

export function bindInteraction(display: DisplayHandle, emitter: Emitter, diagramId: string, options: BindInteractionOptions = {}): InteractionHandle {
  const selectable = options.selectable ?? true;
  const svg = display.svg;
  let selection = new Set<string>();
  const owners = new Map<string, OwnerRef>();

  const paintSelection = () => {
    // The viewer draws its own selection indicator (see selectionOverlay.ts)
    // rather than toggling an attribute a host's CSS would need to style —
    // that previous mechanism only worked if a host happened to ship a
    // matching stylesheet, and recolored the shape's own stroke instead of
    // showing a separate indicator the way the real app does.
    svg.querySelectorAll('[data-sf-selection-overlay]').forEach(el => el.remove());
    const doc = svg.ownerDocument;
    selection.forEach(id => {
      const primary = findOwnerNode(svg, id, isPrimary);
      if (!primary) return;
      const owner = owners.get(id);
      const overlay = owner?.role === 'link'
        ? linkSelectionOverlay(doc, primary as unknown as SVGPathElement, id)
        : shapeSelectionOverlay(doc, primary, id);
      svg.appendChild(overlay);
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

  const modifiersOf = (e: MouseEvent | KeyboardEvent) => ({ shift: e.shiftKey, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey });

  // --- selection + click ---------------------------------------------------
  // `panable` is decided once, at pointerdown: a drag starting on empty chrome
  // pans the camera; a drag starting on an owner (entity/link/…), a resize
  // handle, or a link endpoint does not — otherwise dragging a shape (or
  // resizing/reconnecting it) would fight camera panning, and once
  // `stickyflow/interaction` binds shape movement/resize/reconnect on top of
  // this same svg, it would have no way to claim that gesture (this tier
  // can't know about that tier — one-way dependency — so it backs off from
  // any owned target instead). Resize handles and link endpoints specifically
  // are the interaction-tier targets this tier CAN recognize by attribute
  // name even without knowing about that tier — it drew them itself, in
  // selectionOverlay.ts — unlike an owner's own click target, which handles
  // don't have (data-sf-id only ever lives on scene nodes, not this overlay).
  let down: { x: number; y: number; moved: boolean; panable: boolean } | null = null;

  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as Element | null;
    const owner = resolveOwner(target);
    const onResizeHandle = !!target?.closest('[data-sf-resize-handle]');
    const onLinkEndpoint = !!target?.closest('[data-sf-link-endpoint]');
    down = { x: e.clientX, y: e.clientY, moved: false, panable: !owner && !onResizeHandle && !onLinkEndpoint };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (down) {
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_THRESHOLD) down.moved = true;
      if (down.moved) {
        if (down.panable) display.panBy(e.movementX, e.movementY);
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
    // A bare (non-drag) click landing on a resize handle or a link endpoint
    // isn't a click on empty chrome — it's an aborted resize/reconnect
    // attempt. Clearing selection here would make the handles the reader was
    // just trying to grab vanish out from under them.
    if (!owner) { if (!target?.closest('[data-sf-resize-handle], [data-sf-link-endpoint]')) setSelection(selectionReducer(selection, { type: 'clear' })); return; }
    owners.set(owner.id, owner);
    setSelection(selectionReducer(selection, clickAction(owner.id, modifiersOf(e))));
    emitter.emit(owner.role === 'link' ? 'linkClick' : 'entityClick', { diagramId, owner, modifiers: modifiersOf(e) });
  };

  // --- wheel zoom ----------------------------------------------------------
  // Only zooms with Ctrl/Cmd held (same convention as Google Maps, Figma,
  // CodeSandbox, etc. — and how browsers report trackpad pinch as a wheel
  // event, so this doubles as pinch-to-zoom for free). A bare wheel event is
  // left alone so the page keeps scrolling normally when the cursor happens
  // to pass over an embedded diagram — the previous unconditional
  // preventDefault() hijacked the page's scroll the instant it did.
  const onWheel = (e: WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    display.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY);
  };

  // --- keyboard ------------------------------------------------------------
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
