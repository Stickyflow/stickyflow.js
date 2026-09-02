import type { Modifiers, OwnerRef } from '../domContract';
import { Emitter as GenericEmitter, type Unsubscribe } from '../eventing/emitter';

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type { Modifiers, OwnerRef };

export interface OwnerPointerEvent {
  diagramId: string;
  owner: OwnerRef;
  modifiers: Modifiers;
}

export interface SelectionChangeEvent {
  diagramId: string;
  selection: OwnerRef[];
}

export interface ViewerErrorEvent {
  diagramId: string;
  code: 'contract-mismatch' | 'render-failed' | 'no-svg';
  message: string;
}

/** Owner ids added/removed/changed by the last update() call — see
 *  display/types.ts's SceneDiff for what "changed" means at owner
 *  granularity. Always emitted on update(), independent of the
 *  `highlightChanges` flag that gates the built-in flash: a host can use this
 *  for its own purposes (a toast, a log) without opting into the overlay. */
export interface SceneDiffEvent {
  diagramId: string;
  added: string[];
  removed: string[];
  changed: string[];
}

export interface ViewerEventMap {
  ready: { diagramId: string };
  entityClick: OwnerPointerEvent;
  linkClick: OwnerPointerEvent;
  ownerHover: OwnerPointerEvent | { diagramId: string; owner: null };
  selectionChange: SelectionChangeEvent;
  sceneDiff: SceneDiffEvent;
  error: ViewerErrorEvent;
}

export type ViewerEventName = keyof ViewerEventMap;
export type ViewerEventHandler<T extends ViewerEventName> = (event: ViewerEventMap[T]) => void;
export type { Unsubscribe };

export const NO_MODIFIERS: Modifiers = { shift: false, ctrl: false, meta: false, alt: false };

export function ownerPointerEvent(diagramId: string, owner: OwnerRef, modifiers: Modifiers): OwnerPointerEvent {
  return { diagramId, owner, modifiers };
}

export class Emitter extends GenericEmitter<ViewerEventMap> {}
