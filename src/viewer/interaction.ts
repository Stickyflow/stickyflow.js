// INTERACTION layer: wires DOM input events on top of the static display, using
// the pure contract/selection/event helpers. This is the only place with event
// listeners; display.ts stays a listener-free camera. (DOM code — verify in a
// browser.) Read-only tier: selection/hover/pan/zoom plus the selection's own
// visual indicator. Mutating interactions (text edit, future drag) live in the
// separate `stickyflow/interaction` package instead — see src/interaction/.
import type { DisplayHandle } from './display';
import { resolveOwner, isCameraGesture } from './contract';
import { selectionReducer, clickAction } from './selection';
import { Emitter, type OwnerRef } from './events';
import { findOwnerNode, isPrimary } from './domQuery';
import { shapeSelectionOverlay, linkSelectionOverlay, quickDuplicateBubbles } from './selectionOverlay';
import { shapeChangeOverlay, linkChangeOverlay, startFade, FLASH_DUR_MS, REDUCED_MOTION_DUR_MS } from './changeOverlay';

export interface InteractionHandle {
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  /** Briefly flash a ring/halo around each given owner — see changeOverlay.ts.
   *  Ids that don't resolve to a live node (e.g. already gone by the time this
   *  runs) are silently skipped, not an error. `color` defaults to
   *  changeOverlay.ts's own CHANGE_COLOR when omitted — a host passes its own
   *  to distinguish categories of external change (e.g. a different color for
   *  a likely bulk/tool-driven rewrite vs. an ordinary edit). */
  flashChanged(diff: { added: string[]; changed: string[] }, color?: string): void;
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
  // Pending removal timers for change-overlay flashes, keyed by owner id —
  // lets a second flash landing on the same id before the first one's timer
  // fires cancel that stale timer instead of racing it (see flashChanged).
  const changeTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
      // Only a single selected entity gets quick-duplicate bubbles — matching
      // the interactive canvas app's own "isSelected && !isMultiSelected"
      // gate, and entities only (not links/frames/tables/swimlanes): the
      // whole feature is about spinning off one more shape of the same kind.
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

  // Resolves role straight off the DOM contract (data-sf-role) rather than
  // the `owners` cache above — that cache is populated lazily, only from
  // clicks/select() calls, so an id arriving fresh from an external
  // sceneDiff (the whole point of this feature) was very possibly never
  // clicked and would silently miss the cache.
  const flashChanged: InteractionHandle['flashChanged'] = (diff, color) => {
    const ids = [...new Set([...diff.added, ...diff.changed])];
    if (!ids.length) return;
    const doc = svg.ownerDocument;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    ids.forEach(id => {
      const primary = findOwnerNode(svg, id, isPrimary);
      if (!primary) return;
      const pending = changeTimers.get(id);
      if (pending) clearTimeout(pending);
      svg.querySelectorAll(`[data-sf-change-overlay="${CSS.escape(id)}"]`).forEach(node => node.remove());
      const role = primary.getAttribute('data-sf-role');
      const overlay = role === 'link'
        ? linkChangeOverlay(doc, primary as unknown as SVGPathElement, id, color)
        : shapeChangeOverlay(doc, primary, id, color);
      svg.appendChild(overlay);
      startFade(overlay, reducedMotion); // after appending, not inside shapeChangeOverlay/linkChangeOverlay — see startFade's doc comment
      const duration = reducedMotion ? REDUCED_MOTION_DUR_MS : FLASH_DUR_MS;
      // Closes over this specific overlay element, not a re-query at fire
      // time — a second flash on the same id landing before this timer
      // fires already removed+replaced `overlay` above, so a re-query here
      // would risk deleting that fresher group instead of this stale one.
      changeTimers.set(id, setTimeout(() => { overlay.remove(); changeTimers.delete(id); }, duration));
    });
  };

  const modifiersOf = (e: MouseEvent | KeyboardEvent) => ({ shift: e.shiftKey, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey });

  // --- selection + click ---------------------------------------------------
  // `panable` is decided once, at pointerdown, and the deciding question is the
  // MODIFIER, not what sits under the cursor: Ctrl/Cmd held means the reader is
  // driving the camera, so a drag pans wherever it began — including on top of a
  // shape. That is what makes a zoomed-in diagram navigable at all; gating pan on
  // "started over empty canvas" (as this once did) meant the more the shapes
  // filled the viewport, the less of it could be reached.
  //
  // The other half of the rule lives in `stickyflow/interaction`: move, resize,
  // reconnect and quick-duplicate each decline while the modifier is held, so
  // nothing fights the camera for the gesture. Both halves read the same
  // predicate (isCameraGesture) rather than re-testing the keys independently.
  //
  // A bare drag (no modifier) still pans only over empty chrome, so an embedded
  // diagram never hijacks a host page's own scroll/selection gestures.
  let down: { x: number; y: number; moved: boolean; panable: boolean } | null = null;

  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as Element | null;
    const overContent = !!resolveOwner(target)
      || !!target?.closest('[data-sf-resize-handle], [data-sf-link-endpoint], [data-sf-quick-duplicate]');
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
    // A bare (non-drag) click landing on a resize handle or a link endpoint
    // isn't a click on empty chrome — it's an aborted resize/reconnect
    // attempt. Clearing selection here would make the handles the reader was
    // just trying to grab vanish out from under them.
    if (!owner) { if (!target?.closest('[data-sf-resize-handle], [data-sf-link-endpoint], [data-sf-quick-duplicate]')) setSelection(selectionReducer(selection, { type: 'clear' })); return; }
    owners.set(owner.id, owner);
    setSelection(selectionReducer(selection, clickAction(owner.id, modifiersOf(e))));
    emitter.emit(owner.role === 'link' ? 'linkClick' : 'entityClick', { diagramId, owner, modifiers: modifiersOf(e) });
    // A click's native focusing step only reaches the actual target's focusable
    // ANCESTORS — and the primary node (the one with tabindex="0") is a sibling
    // of its own text label, not an ancestor, so a click landing on the label
    // (which paints on top of the shape and so catches most real clicks) left
    // nothing focused. Every keydown-based feature (Escape-clears-selection
    // here, and stickyflow/interaction's Backspace-to-delete) depends on that
    // focus, so it's forced explicitly rather than left to the browser default.
    findOwnerNode(svg, owner.id, isPrimary)?.focus({ preventScroll: true });
  };

  // --- wheel zoom ----------------------------------------------------------
  // Only zooms with Ctrl/Cmd held (same convention as Google Maps, Figma,
  // CodeSandbox, etc. — and how browsers report trackpad pinch as a wheel
  // event, so this doubles as pinch-to-zoom for free). A bare wheel event is
  // left alone so the page keeps scrolling normally when the cursor happens
  // to pass over an embedded diagram — the previous unconditional
  // preventDefault() hijacked the page's scroll the instant it did.
  const onWheel = (e: WheelEvent) => {
    if (!isCameraGesture(e)) return;
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
    flashChanged,
    destroy() {
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('keydown', onKeyDown);
      changeTimers.forEach(timer => clearTimeout(timer));
      changeTimers.clear();
    },
  };
}
