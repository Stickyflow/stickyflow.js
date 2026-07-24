// Pure viewer event types + payload builders (no DOM). Every payload is
// serializable so a host (e.g. a chatbot) can forward it straight into model
// context. This file is the interaction tier's vocabulary and is node-testable.
import type { SceneRole } from '../rendering/renderScene';

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

/**
 * Fired after a double-click text edit is committed (Enter or blur, value
 * changed). The viewer does not mutate its own model or emit SFL — a host
 * (e.g. a chatbot integration) owns turning this into new source and calling
 * `viewer.update()`, the same way a controlled `<input>` needs its parent to
 * pass back a new value or the edit visually reverts.
 */
export interface TextChangeEvent {
  diagramId: string;
  owner: OwnerRef;
  text: string;
}

export interface ViewerEventMap {
  ready: { diagramId: string };
  entityClick: OwnerPointerEvent;
  linkClick: OwnerPointerEvent;
  ownerHover: OwnerPointerEvent | { diagramId: string; owner: null };
  selectionChange: SelectionChangeEvent;
  textChange: TextChangeEvent;
  error: ViewerErrorEvent;
}

export type ViewerEventName = keyof ViewerEventMap;
export type ViewerEventHandler<T extends ViewerEventName> = (event: ViewerEventMap[T]) => void;
export type Unsubscribe = () => void;

export const NO_MODIFIERS: Modifiers = { shift: false, ctrl: false, meta: false, alt: false };

/** Build a click/hover payload for an owner. Pure — inputs are already resolved. */
export function ownerPointerEvent(diagramId: string, owner: OwnerRef, modifiers: Modifiers): OwnerPointerEvent {
  return { diagramId, owner, modifiers };
}

/** Minimal, framework-free event emitter shared by the viewer. */
export class Emitter {
  private handlers = new Map<ViewerEventName, Set<(event: never) => void>>();

  on<T extends ViewerEventName>(name: T, handler: ViewerEventHandler<T>): Unsubscribe {
    let set = this.handlers.get(name);
    if (!set) { set = new Set(); this.handlers.set(name, set); }
    set.add(handler as (event: never) => void);
    return () => set!.delete(handler as (event: never) => void);
  }

  emit<T extends ViewerEventName>(name: T, event: ViewerEventMap[T]): void {
    this.handlers.get(name)?.forEach(handler => (handler as ViewerEventHandler<T>)(event));
  }

  clear(): void { this.handlers.clear(); }
}
