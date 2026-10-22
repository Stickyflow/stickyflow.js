import type { Dimension } from '../../../model/dimension';
import type { SflDimensionObject } from '../../../sflSemantic/sflToCanvasState';
import { numOf, solidColor } from './values';

export function dimensionObject(canvasObject: SflDimensionObject): Dimension {
  const presentation = canvasObject.props;
  return {
    id: canvasObject.id,
    start: canvasObject.dimension.start,
    end: canvasObject.dimension.end,
    offset: canvasObject.dimension.offset,
    text: canvasObject.text,
    unit: canvasObject.dimension.unit,
    strokeColor: solidColor(presentation.stroke),
    strokeWidth: numOf(presentation.strokeWidth),
    textColor: solidColor(presentation.textColor),
    fontSize: numOf(presentation.fontSize),
    order: canvasObject.order,
    sourceIndex: canvasObject.sourceIndex,
    parentFrameId: canvasObject.parentFrameId,
  };
}
