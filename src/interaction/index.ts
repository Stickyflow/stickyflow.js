// Public MUTATING-INTERACTION entry (import 'stickyflow/interaction'). Adds
// double-click text editing (and, later, drag) on top of an existing
// `stickyflow/viewer` instance — never the other way round, the same one-way
// layering as viewer -> web-component. Framework-independent: takes a plain
// Viewer, no React/Vue/etc. dependency.
import type { Viewer } from '../viewer';
import { bindTextEditing, type TextEditingHandle } from './textEdit';
import { Emitter, type TextEditEventName, type TextEditEventMap } from './events';
import type { Unsubscribe } from '../shared/emitter';

export interface Interaction {
  on<T extends TextEditEventName>(name: T, handler: (event: TextEditEventMap[T]) => void): Unsubscribe;
  destroy(): void;
}

/** Bind mutating interactions (currently: double-click text edit) onto an existing viewer. */
export function bindEditing(viewer: Viewer): Interaction {
  const emitter = new Emitter();
  const textEditing: TextEditingHandle = bindTextEditing(viewer, emitter);

  return {
    on: (name, handler) => emitter.on(name, handler),
    destroy() {
      textEditing.destroy();
      emitter.clear();
    },
  };
}

export type { TextChangeEvent, TextEditEventMap, TextEditEventName } from './events';
export type { Unsubscribe } from '../shared/emitter';
