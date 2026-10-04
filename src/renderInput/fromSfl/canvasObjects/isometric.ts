import type { IsometricObject } from '../../../model/isometricObject';
import type { SflIsometricObject } from '../../../sflSemantic/sflToCanvasState';
import { decodeShadow } from '../../styleDecoding';
import { numOf, solidColor } from './values';

export function isometricObject(canvasObject: SflIsometricObject): IsometricObject {
  const presentation = canvasObject.props;
  const shadowStyle = decodeShadow(presentation.shadow);

  return {
    id: canvasObject.id,
    x: canvasObject.x,
    y: canvasObject.y,
    width: canvasObject.width,
    height: canvasObject.height,
    depth: canvasObject.isometric.depth,
    rotation: canvasObject.rotation,
    order: canvasObject.order,
    text: canvasObject.text,
    icon: canvasObject.isometric.icon,
    fill: solidColor(presentation.fill) ?? '#f8fafc',
    strokeColor: solidColor(presentation.stroke) ?? '#111827',
    strokeWidth: numOf(presentation.strokeWidth) ?? 1,
    cornerRadius: numOf(presentation.cornerRadius) ?? 8,
    hasShadow: shadowStyle?.enabled ?? false,
    shadowStyle,
    labelOffsetX: numOf(presentation.labelOffsetX) ?? 0,
    labelOffsetY: numOf(presentation.labelOffsetY) ?? 0,
    labelBackground: solidColor(presentation.labelBackground),
    parentFrameId: canvasObject.parentFrameId,
  };
}
