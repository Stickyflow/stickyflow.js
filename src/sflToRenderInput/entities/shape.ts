import { SHAPE_TYPES, type ShapeType } from '../../model/shapes';
import { decodeColor, decodeShadow } from '../../sfl/decodeStyles';
import type { SflEntityOut } from '../../sfl/sflToCanvasState';
import {
  dashArray,
  FONT_WEIGHTS,
  numOf,
  oneOf,
  optionalOneOf,
  SHAPE_STROKE_STYLES,
  strokePaint,
  TEXT_ALIGNS,
  VERTICAL_ALIGNS,
} from './values';

function asShapeType(value: string | undefined): ShapeType {
  return SHAPE_TYPES.includes(value as ShapeType) ? (value as ShapeType) : 'rectangle';
}

export function shapeObject(e: SflEntityOut) {
  const p = e.props;
  return {
    id: e.id,
    type: 'shape',
    text: e.text ?? null,
    shapeType: asShapeType(e.shapeType),
    symbol: e.symbol,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    w: e.width,
    h: e.height,
    rotation: e.rotation ?? 0,
    fillColor: decodeColor(p.fill),
    strokeColor: strokePaint(p.stroke),
    strokeWidth: numOf(p.strokeWidth),
    textColor: p.textColor,
    fontSize: numOf(p.fontSize),
    fontWeight: p.fontWeight === undefined ? undefined : oneOf(p.fontWeight, FONT_WEIGHTS, 'normal'),
    fontFamily: p.fontFamily,
    textAlign: optionalOneOf(p.textAlign, TEXT_ALIGNS),
    textVerticalAlign: optionalOneOf(p.verticalAlign, VERTICAL_ALIGNS),
    cornerRadius: numOf(p.cornerRadius),
    shadowStyle: decodeShadow(p.shadow),
    dash: dashArray(p.dash),
    strokeStyle: optionalOneOf(p.strokeStyle, SHAPE_STROKE_STYLES),
    shapeStyle: p.opacity !== undefined ? { opacity: numOf(p.opacity) } : undefined,
    imageUrl: p.src,
    imageFit: p.fit as 'cover' | 'contain' | undefined,
    parent_frame_id: e.parentFrameId,
    order: e.order,
  };
}
