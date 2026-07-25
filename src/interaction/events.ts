// Event vocabulary for the mutating tier (`stickyflow/interaction`), kept
// separate from the read-only `stickyflow/viewer` tier's ViewerEventMap.
import type { OwnerRef } from '../viewer';
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

export interface InteractionEventMap {
  textChange: TextChangeEvent;
  moveChange: MoveChangeEvent;
  resizeChange: ResizeChangeEvent;
}

export type InteractionEventName = keyof InteractionEventMap;
export class Emitter extends GenericEmitter<InteractionEventMap> {}
export type { Unsubscribe } from '../shared/emitter';
