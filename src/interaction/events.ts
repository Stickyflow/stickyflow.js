// Event vocabulary for the mutating tier (`stickyflow/interaction`), kept
// separate from the read-only `stickyflow/viewer` tier's ViewerEventMap —
// this is where future mutating events (e.g. a later moveChange for dragging)
// belong, not in the viewer.
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

export interface TextEditEventMap {
  textChange: TextChangeEvent;
}

export type TextEditEventName = keyof TextEditEventMap;
export class Emitter extends GenericEmitter<TextEditEventMap> {}
export type { Unsubscribe } from '../shared/emitter';
