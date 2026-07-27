// Event vocabulary for the mutating tier (`stickyflow/interaction`), kept
// separate from the read-only `stickyflow/viewer` tier's ViewerEventMap.
import type { OwnerRef } from '../viewer';
import type { Side } from '../model/geometry/router';
import { Emitter as GenericEmitter } from '../shared/emitter';

/**
 * Fired after a double-click text edit is committed (Enter or blur, value
 * changed). This tier does not mutate the viewer's rendered SVG or emit SFL —
 * a host (e.g. a chatbot integration) owns turning this into new source and
 * calling `viewer.update()`, the same way a controlled `<input>` needs its
 * parent to pass back a new value or the edit visually reverts.
 */
export interface TextChangeEvent {
  owner: OwnerRef;
  text: string;
}

/**
 * Fired after a shape drag is released (pointer moved past the drag
 * threshold at least once). `dx`/`dy` are in the diagram's own SFL/user-space
 * units, already accounting for the current pan/zoom — add them straight to
 * the entity's `layout { position }` in your source. Same "controlled
 * component" contract as TextChangeEvent: the viewer's own SVG stays visually
 * moved (a live preview) until the host reflects the accepted change via
 * `viewer.update()`; it snaps back to the old position otherwise.
 */
export interface MoveChangeEvent {
  owner: OwnerRef;
  dx: number;
  dy: number;
}

/**
 * Fired after a corner-handle resize is released. Both a delta form
 * (dx/dy/dWidth/dHeight — dx/dy are 0 unless the top or left edge moved,
 * e.g. dragging the top-left handle) and the resulting absolute bounds
 * (x/y/width/height) are included: a size is just as often inherited from a
 * shared `Layout` block as set inline on the entity, so a host can't always
 * "add a delta to the entity's own size" — it may not have one to add to.
 * Same controlled-component contract as MoveChangeEvent.
 */
export interface ResizeChangeEvent {
  owner: OwnerRef;
  dx: number;
  dy: number;
  dWidth: number;
  dHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Fired after dragging a link's start or end handle onto a new anchor point
 * is released — either a different spot on the same entity (re-pinning the
 * side/fraction) or an entirely different entity. `target` is whatever was
 * under the pointer at drop; `side`/`fraction` are that entity's own anchor
 * (fraction 0..1 along the side, same meaning as the `(0.5)` in
 * `from: a, right (0.5)`). Only fires on a VALID drop (released over some
 * entity) — dropped over empty canvas cancels the gesture: the live preview
 * reverts and no event fires, same as pressing Escape mid-drag would. Same
 * controlled-component contract as MoveChangeEvent: nothing is real until
 * the host reflects it via `viewer.update()`.
 */
export interface LinkReconnectEvent {
  owner: OwnerRef;
  end: 'from' | 'to';
  target: OwnerRef;
  side: Side;
  fraction: number;
}

/**
 * Fired on a (non-drag) click of one of an entity's four quick-duplicate
 * bubbles (see viewer/selectionOverlay.ts's quickDuplicateBubbles — only
 * shown for a single selected entity). Reports only what was clicked and
 * which side, the same "controlled component" way every event here does —
 * this package has no reverse SFL emitter, so it can't invent the new
 * entity's id, copy its style, or decide a duplicate's spacing convention
 * itself; a host composes that from `insertEntity`/`insertLink` (see
 * examples/sfl-chat for a worked implementation).
 */
export interface QuickDuplicateEvent {
  owner: OwnerRef;
  direction: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Fired when Backspace/Delete is pressed while one or more owners are
 * selected. `owners` is the full current selection at the moment of the
 * keypress (matches viewer.getSelection()) — a host removes each one (e.g.
 * via `removeEntity`/`removeLink`) and calls `viewer.update()`; nothing is
 * actually deleted by this tier itself.
 */
export interface DeleteEvent {
  owners: OwnerRef[];
}

export interface InteractionEventMap {
  textChange: TextChangeEvent;
  moveChange: MoveChangeEvent;
  resizeChange: ResizeChangeEvent;
  linkReconnect: LinkReconnectEvent;
  quickDuplicate: QuickDuplicateEvent;
  delete: DeleteEvent;
}

export type InteractionEventName = keyof InteractionEventMap;
export class Emitter extends GenericEmitter<InteractionEventMap> {}
export type { Unsubscribe } from '../shared/emitter';
