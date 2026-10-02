import type { ShapeType } from '../../../model/shape';
import type { SflEntityOut } from '../../../sflSemantic/sflToCanvasState';
import { decodeColor, decodeShadow } from '../../styleDecoding';
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

function shapeTypeOf(value: string | undefined): ShapeType {
  return (value || 'rectangle') as ShapeType;
}

export function shapeObject(e: SflEntityOut) {
  const p = e.props;
  return {
    id: e.id,
    type: 'shape',
    text: e.text ?? null,
    shapeType: shapeTypeOf(e.shapeType),
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
    opacity: numOf(p.opacity),
    parentFrameId: e.parentFrameId,
    order: e.order,
  };
}
