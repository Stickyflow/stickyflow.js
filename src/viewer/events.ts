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

export interface ViewerEventMap {
  ready: { diagramId: string };
  entityClick: OwnerPointerEvent;
  linkClick: OwnerPointerEvent;
  ownerHover: OwnerPointerEvent | { diagramId: string; owner: null };
  selectionChange: SelectionChangeEvent;
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
