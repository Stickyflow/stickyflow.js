// Pure viewer event types + payload builders (no DOM). Every payload is
// serializable so a host (e.g. a chatbot) can forward it straight into model
// context. This file is the read-only viewer tier's vocabulary and is
// node-testable. Mutating events (textChange, future moveChange) live in
// `stickyflow/interaction` instead — see src/interaction/events.ts.
import type { SceneRole } from '../rendering/renderScene';
import { Emitter as GenericEmitter, type Unsubscribe } from '../shared/emitter';

export type JsonValue =
  | string | number | boolean | null
  | JsonValue[] | { [key: string]: JsonValue };

/** The semantic owner a DOM node belongs to, resolved via the DOM contract. */
export interface OwnerRef {
  role: SceneRole;
  id: string;
  kind?: string;
  label?: string;
}

export interface Modifiers { shift: boolean; ctrl: boolean; meta: boolean; alt: boolean }

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

/** Build a click/hover payload for an owner. Pure — inputs are already resolved. */
export function ownerPointerEvent(diagramId: string, owner: OwnerRef, modifiers: Modifiers): OwnerPointerEvent {
  return { diagramId, owner, modifiers };
}

/** The viewer tier's own emitter, typed to ViewerEventMap. */
export class Emitter extends GenericEmitter<ViewerEventMap> {}
