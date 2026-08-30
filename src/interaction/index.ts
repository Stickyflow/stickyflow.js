// Public MUTATING-INTERACTION entry (import 'stickyflow/interaction'). Adds
// double-click text editing, drag-to-move, drag-to-resize, drag-to-reconnect
// link endpoints, quick-duplicate bubbles, and delete-key removal on top of
// an existing `stickyflow/viewer` instance — never the other way round, the
// same one-way layering as viewer -> web-component. Framework-independent:
// takes a plain Viewer, no React/Vue/etc. dependency.
import type { Viewer } from '../viewer';
import { bindTextEditing, type TextEditingHandle } from './textEdit';
import { bindShapeMovement, type MoveDragHandle } from './moveDrag';
import { bindShapeResize, type ResizeDragHandle } from './resizeDrag';
import { bindLinkEndpointDrag, type LinkEndpointDragHandle } from './linkEndpointDrag';
import { bindQuickDuplicate, type QuickDuplicateHandle } from './quickDuplicate';
import { bindDeleteSelection, type DeleteSelectionHandle } from './deleteSelection';
import { bindChartValueDrag, type ChartValueDragHandle } from './chartValueDrag';
import { Emitter, type InteractionEventName, type InteractionEventMap } from './events';
import type { Unsubscribe } from '../shared/emitter';

export interface Interaction {
  on<T extends InteractionEventName>(name: T, handler: (event: InteractionEventMap[T]) => void): Unsubscribe;
  destroy(): void;
}

/** Bind mutating interactions (text edit, drag-to-move/resize, drag-to-reconnect links, quick-duplicate, delete) onto an existing viewer. */
export function bindEditing(viewer: Viewer): Interaction {
  const emitter = new Emitter();
  const textEditing: TextEditingHandle = bindTextEditing(viewer, emitter);
  const movement: MoveDragHandle = bindShapeMovement(viewer, emitter);
  const resize: ResizeDragHandle = bindShapeResize(viewer, emitter);
  const linkEndpoints: LinkEndpointDragHandle = bindLinkEndpointDrag(viewer, emitter);
  const quickDuplicate: QuickDuplicateHandle = bindQuickDuplicate(viewer, emitter);
  const deleteSelection: DeleteSelectionHandle = bindDeleteSelection(viewer, emitter);
  // Bound after movement: a chart mark is inside the chart's own bounds, so
  // both gestures see the same pointerdown. chartValueDrag stops propagation
  // when it claims one, which is what keeps dragging a bar from also
  // dragging the whole chart across the canvas.
  const chartValues: ChartValueDragHandle = bindChartValueDrag(viewer, emitter);

  return {
    on: (name, handler) => emitter.on(name, handler),
    destroy() {
      textEditing.destroy();
      movement.destroy();
      resize.destroy();
      linkEndpoints.destroy();
      quickDuplicate.destroy();
      deleteSelection.destroy();
      chartValues.destroy();
      emitter.clear();
    },
  };
}

export type {
  TextChangeEvent, MoveChangeEvent, ResizeChangeEvent, LinkReconnectEvent, QuickDuplicateEvent, LinkToEvent, DeleteEvent,
  ChartValueChangeEvent, InteractionEventMap, InteractionEventName,
} from './events';
export type { Unsubscribe } from '../shared/emitter';

// Pure (no DOM) — turns the change events straight into updated SFL text, so
// a host doesn't have to write its own patcher. Usable from Node too (e.g. a
// server-side chatbot host with no viewer at all), unlike the DOM-bound
// bindEditing() above.
export { applyTextChange, applyMoveChange, applyResizeChange, applyLinkReconnectChange, applyChartValueChange } from './patchSfl';

// Structural changes (create/delete). `insertEntity`/`insertLink` are also
// what a host composes `quickDuplicate` into (this tier only reports which
// entity/side was clicked — copying the source's style/size and generating
// new ids is a host decision, see examples/sfl-chat); `insertLink` alone is
// what a host composes `linkTo` into (dragging a quick-duplicate bubble onto
// an existing entity instead of releasing it as a bare click); `removeEntity`/
// `removeLink` are what a host calls in response to `delete`. Also callable
// directly with no matching gesture at all — e.g. reflecting an LLM-authored
// change — and pass the result to viewer.update() the same way.
export { insertEntity, removeEntity, insertLink, removeLink } from './patchSfl';
export type { InsertEntityOptions, RemoveEntityOptions, InsertLinkOptions } from './patchSfl';
