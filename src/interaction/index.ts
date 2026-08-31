import type { Unsubscribe } from '../shared/emitter';
import type { Viewer } from '../viewer';
import { bindChartValueDrag, type ChartValueDragHandle } from './chartValueDrag';
import { bindDeleteSelection, type DeleteSelectionHandle } from './deleteSelection';
import { Emitter, type InteractionEventMap, type InteractionEventName } from './events';
import { bindLinkEndpointDrag, type LinkEndpointDragHandle } from './linkEndpointDrag';
import { bindShapeMovement, type MoveDragHandle } from './moveDrag';
import { bindQuickDuplicate, type QuickDuplicateHandle } from './quickDuplicate';
import { bindShapeResize, type ResizeDragHandle } from './resizeDrag';
import { bindTextEditing, type TextEditingHandle } from './textEdit';

export interface Interaction {
  on<T extends InteractionEventName>(name: T, handler: (event: InteractionEventMap[T]) => void): Unsubscribe;
  destroy(): void;
}

export function bindEditing(viewer: Viewer): Interaction {
  const emitter = new Emitter();
  const textEditing: TextEditingHandle = bindTextEditing(viewer, emitter);
  const movement: MoveDragHandle = bindShapeMovement(viewer, emitter);
  const resize: ResizeDragHandle = bindShapeResize(viewer, emitter);
  const linkEndpoints: LinkEndpointDragHandle = bindLinkEndpointDrag(viewer, emitter);
  const quickDuplicate: QuickDuplicateHandle = bindQuickDuplicate(viewer, emitter);
  const deleteSelection: DeleteSelectionHandle = bindDeleteSelection(viewer, emitter);
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

export type { Unsubscribe } from '../shared/emitter';
export type {
  ChartValueChangeEvent,
  DeleteEvent,
  InteractionEventMap,
  InteractionEventName,
  LinkReconnectEvent,
  LinkToEvent,
  MoveChangeEvent,
  QuickDuplicateEvent,
  ResizeChangeEvent,
  TextChangeEvent,
} from './events';
export type { InsertEntityOptions, InsertLinkOptions, RemoveEntityOptions } from './patchSfl';
export {
  applyChartValueChange,
  applyLinkReconnectChange,
  applyMoveChange,
  applyResizeChange,
  applyTextChange,
  insertEntity,
  insertLink,
  removeEntity,
  removeLink,
} from './patchSfl';
