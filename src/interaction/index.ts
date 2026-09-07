import type { Unsubscribe } from '../eventing/emitter';
import type { Viewer } from '../viewer';
import { bindChartValueDrag, type ChartValueDragHandle } from './chartValueDrag';
import { bindColorEdit, type ColorEditHandle } from './colorEdit/binding';
import { bindDeleteSelection, type DeleteSelectionHandle } from './deleteSelection';
import { Emitter, type InteractionEventMap, type InteractionEventName } from './events';
import { bindLinkEndpointDrag, type LinkEndpointDragHandle } from './linkEndpointDrag';
import { bindShapeMovement, type MoveDragHandle } from './moveDrag';
import { bindPropertyDrag, type PropertyDragHandle } from './propertyDrag/binding';
import { bindPropertyEditing, type PropertyEditingHandle, type PropertyEditingOptions } from './propertyEdit';
import { bindQuickDuplicate, type QuickDuplicateHandle } from './quickDuplicate';
import { bindShapeResize, type ResizeDragHandle } from './resizeDrag';
import { bindTextEditing, type TextEditingHandle } from './textEdit';

export interface Interaction {
  on<T extends InteractionEventName>(name: T, handler: (event: InteractionEventMap[T]) => void): Unsubscribe;
  destroy(): void;
}

export interface EditingOptions {
  properties?: PropertyEditingOptions;
}

export function bindEditing(viewer: Viewer, options: EditingOptions = {}): Interaction {
  const emitter = new Emitter();
  const textEditing: TextEditingHandle = bindTextEditing(viewer, emitter);
  const movement: MoveDragHandle = bindShapeMovement(viewer, emitter);
  const resize: ResizeDragHandle = bindShapeResize(viewer, emitter);
  const linkEndpoints: LinkEndpointDragHandle = bindLinkEndpointDrag(viewer, emitter);
  const quickDuplicate: QuickDuplicateHandle = bindQuickDuplicate(viewer, emitter);
  const deleteSelection: DeleteSelectionHandle = bindDeleteSelection(viewer, emitter);
  const chartValues: ChartValueDragHandle = bindChartValueDrag(viewer, emitter);
  const properties: PropertyEditingHandle | null = options.properties
    ? bindPropertyEditing(viewer, emitter, options.properties)
    : null;
  const propertyDrag: PropertyDragHandle | null = options.properties
    ? bindPropertyDrag(viewer, emitter, options.properties.editable)
    : null;
  const colorEdit: ColorEditHandle | null = options.properties
    ? bindColorEdit(viewer, emitter, options.properties.editable, options.properties.colorPickerTheme)
    : null;

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
      properties?.destroy();
      propertyDrag?.destroy();
      colorEdit?.destroy();
      emitter.clear();
    },
  };
}

export type { Unsubscribe } from '../eventing/emitter';
export type { ColorEditHandle } from './colorEdit/binding';
export { openColorPopover } from './colorEdit/popover';
export type { ColorPopoverHandle, ColorPopoverOptions } from './colorEdit/popover';
export type { ColorPickerTheme, ColorPickerThemeOption } from './colorEdit/theme';
export { resolveTheme } from './colorEdit/theme';
export { cssBackground, formatPickerValue, seedFrom } from './colorEdit/value';
export type { PickerValue } from './colorEdit/value';
export { readGradientValue } from './colorEdit/gradientLookup';
export type {
  ChartValueChangeEvent,
  DeleteEvent,
  InteractionEventMap,
  InteractionEventName,
  LinkReconnectEvent,
  LinkToEvent,
  MoveChangeEvent,
  PropertyChangeEvent,
  PropertyValue,
  QuickDuplicateEvent,
  ResizeChangeEvent,
  TextChangeEvent,
} from './events';
export type { InsertEntityOptions, InsertLinkOptions, RemoveEntityOptions } from './patchSfl';
export {
  applyChartValueChange,
  applyLinkReconnectChange,
  applyMoveChange,
  applyPropertyChange,
  applyResizeChange,
  applyTextChange,
  insertEntity,
  insertLink,
  removeEntity,
  removeLink,
} from './patchSfl';
export {
  bindPropertyEditing,
  type EditableRules,
  type PropertyEditingHandle,
  type PropertyEditingOptions,
} from './propertyEdit';
