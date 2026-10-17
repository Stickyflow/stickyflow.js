import type { Unsubscribe } from '../eventing/emitter';
import type { Viewer } from '../viewer';
import { bindChartValueDrag, type ChartValueDragHandle } from './chartValueDrag';
import { bindColorEdit, type ColorEditHandle } from './colorEdit/binding';
import { bindDeleteSelection, type DeleteSelectionHandle } from './deleteSelection';
import { Emitter, type InteractionEventMap, type InteractionEventName } from './events';
import { bindIsometricAxisResize, type IsometricAxisResizeDragHandle } from './isometricAxisResizeDrag';
import { bindIsometricLabelDrag, type IsometricLabelDragHandle } from './isometricLabelDrag/binding';
import { bindIsometricQuickDuplicate, type IsometricQuickDuplicateHandle } from './isometricQuickDuplicate/binding';
import { bindLinkEndpointDrag, type LinkEndpointDragHandle } from './linkEndpointDrag';
import { bindLinkSegmentDrag, type LinkSegmentDragHandle } from './linkSegmentDrag';
import { bindShapeMovement, type MoveDragHandle } from './moveDrag';
import { bindNudgeSelection, type NudgeSelectionHandle } from './nudgeSelection';
import { bindPathDraw, type PathDrawDragHandle, type PathDrawOptions } from './pathDrawDrag';
import { bindPathReshape, type PathReshapeDragHandle } from './pathReshapeDrag';
import { bindPieLabelDrag, type PieLabelDragHandle } from './pieLabelDrag/binding';
import { bindPropertyDrag, type PropertyDragHandle } from './propertyDrag/binding';
import { bindPropertyEditing, type PropertyEditingHandle, type PropertyEditingOptions } from './propertyEdit';
import { bindQuickDuplicate, type QuickDuplicateHandle } from './quickDuplicate';
import { bindRadarVertexDrag, type RadarVertexDragHandle } from './radarVertexDrag/binding';
import { bindShapeResize, type ResizeDragHandle } from './resizeDrag';
import { bindSankeyNode, type SankeyNodeHandle } from './sankeyNode/binding';
import { bindTextEditing, type TextEditingHandle } from './textEdit';

export interface Interaction {
  on<T extends InteractionEventName>(name: T, handler: (event: InteractionEventMap[T]) => void): Unsubscribe;
  startPathDraw(options?: PathDrawOptions): void;
  cancelPathDraw(): void;
  destroy(): void;
}

export interface EditingOptions {
  properties?: PropertyEditingOptions;
}

export function bindEditing(viewer: Viewer, options: EditingOptions = {}): Interaction {
  const emitter = new Emitter();
  const pathDraw: PathDrawDragHandle = bindPathDraw(viewer, emitter);
  const textEditing: TextEditingHandle = bindTextEditing(viewer, emitter);
  const movement: MoveDragHandle = bindShapeMovement(viewer, emitter);
  const resize: ResizeDragHandle = bindShapeResize(viewer, emitter);
  const isometricAxisResize: IsometricAxisResizeDragHandle = bindIsometricAxisResize(viewer, emitter);
  const pathReshape: PathReshapeDragHandle = bindPathReshape(viewer, emitter);
  const linkEndpoints: LinkEndpointDragHandle = bindLinkEndpointDrag(viewer, emitter);
  const linkSegments: LinkSegmentDragHandle = bindLinkSegmentDrag(viewer, emitter);
  const quickDuplicate: QuickDuplicateHandle = bindQuickDuplicate(viewer, emitter);
  const isometricQuickDuplicate: IsometricQuickDuplicateHandle = bindIsometricQuickDuplicate(viewer, emitter);
  const deleteSelection: DeleteSelectionHandle = bindDeleteSelection(viewer, emitter);
  const nudgeSelection: NudgeSelectionHandle = bindNudgeSelection(viewer, emitter);
  const chartValues: ChartValueDragHandle = bindChartValueDrag(viewer, emitter);
  const pieLabels: PieLabelDragHandle = bindPieLabelDrag(viewer, emitter);
  const isometricLabels: IsometricLabelDragHandle = bindIsometricLabelDrag(viewer, emitter);
  const radarVertices: RadarVertexDragHandle = bindRadarVertexDrag(viewer, emitter);
  const sankeyNodes: SankeyNodeHandle = bindSankeyNode(viewer, emitter);
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
    startPathDraw: startOptions => pathDraw.start(startOptions),
    cancelPathDraw: () => pathDraw.cancel(),
    destroy() {
      pathDraw.destroy();
      textEditing.destroy();
      movement.destroy();
      resize.destroy();
      isometricAxisResize.destroy();
      pathReshape.destroy();
      linkEndpoints.destroy();
      linkSegments.destroy();
      quickDuplicate.destroy();
      isometricQuickDuplicate.destroy();
      deleteSelection.destroy();
      nudgeSelection.destroy();
      chartValues.destroy();
      pieLabels.destroy();
      isometricLabels.destroy();
      radarVertices.destroy();
      sankeyNodes.destroy();
      properties?.destroy();
      propertyDrag?.destroy();
      colorEdit?.destroy();
      emitter.clear();
    },
  };
}

export type { Unsubscribe } from '../eventing/emitter';
export type { ColorEditHandle } from './colorEdit/binding';
export { readGradientValue } from './colorEdit/gradientLookup';
export type { ColorPopoverHandle, ColorPopoverOptions } from './colorEdit/popover';
export { openColorPopover } from './colorEdit/popover';
export type { ColorPickerTheme, ColorPickerThemeOption } from './colorEdit/theme';
export { resolveTheme } from './colorEdit/theme';
export type { PickerValue } from './colorEdit/value';
export { cssBackground, formatPickerValue, seedFrom } from './colorEdit/value';
export type {
  ChartValueChangeEvent,
  DeleteEvent,
  InteractionEventMap,
  InteractionEventName,
  IsometricQuickDuplicateDirection,
  LinkReconnectEvent,
  LinkSegmentChangeEvent,
  LinkToEvent,
  MoveChangeEvent,
  PathDrawCompleteEvent,
  PathPoint,
  PathPointChangeEvent,
  PropertyChangeEvent,
  PropertyValue,
  QuickDuplicateEvent,
  ResizeChangeEvent,
  SankeyNodeMoveEvent,
  SankeyNodeRenameEvent,
  TextChangeEvent,
} from './events';
export type {
  InsertCanvasObjectOptions,
  InsertConnectionOptions,
  InsertLinkOptions,
  InsertPathOptions,
  RemoveCanvasObjectOptions,
} from './patchSfl';
export {
  applyChartValueChange,
  applyLinkReconnectChange,
  applyLinkSegmentChange,
  applyMoveChange,
  applyPathPointChange,
  applyPropertyChange,
  applyResizeChange,
  applySankeyNodeMoveChange,
  applySankeyNodeRenameChange,
  applyTextChange,
  insertCanvasObject,
  insertConnection,
  insertLink,
  insertPath,
  removeCanvasObject,
  removeLink,
} from './patchSfl';
export type { PathDrawOptions } from './pathDrawDrag';
export {
  bindPropertyEditing,
  type EditableRules,
  type PropertyEditingHandle,
  type PropertyEditingOptions,
} from './propertyEdit';
