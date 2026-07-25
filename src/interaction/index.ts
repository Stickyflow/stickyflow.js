// Public MUTATING-INTERACTION entry (import 'stickyflow/interaction'). Adds
// double-click text editing and drag-to-move on top of an existing
// `stickyflow/viewer` instance — never the other way round, the same one-way
// layering as viewer -> web-component. Framework-independent: takes a plain
// Viewer, no React/Vue/etc. dependency.
import type { Viewer } from '../viewer';
import { bindTextEditing, type TextEditingHandle } from './textEdit';
import { bindShapeMovement, type MoveDragHandle } from './moveDrag';
import { Emitter, type InteractionEventName, type InteractionEventMap } from './events';
import type { Unsubscribe } from '../shared/emitter';

export interface Interaction {
  on<T extends InteractionEventName>(name: T, handler: (event: InteractionEventMap[T]) => void): Unsubscribe;
  destroy(): void;
}

/** Bind mutating interactions (double-click text edit, drag-to-move) onto an existing viewer. */
export function bindEditing(viewer: Viewer): Interaction {
  const emitter = new Emitter();
  const textEditing: TextEditingHandle = bindTextEditing(viewer, emitter);
  const movement: MoveDragHandle = bindShapeMovement(viewer, emitter);

  return {
    on: (name, handler) => emitter.on(name, handler),
    destroy() {
      textEditing.destroy();
      movement.destroy();
      emitter.clear();
    },
  };
}

export type { TextChangeEvent, MoveChangeEvent, InteractionEventMap, InteractionEventName } from './events';
export type { Unsubscribe } from '../shared/emitter';
