import type { Shader } from '../../../model/shader';
import type { ShapeType } from '../../../model/shape';
import type { SflCanvasObject } from '../../../sflSemantic/sflToCanvasState';
import { decodeColor, decodeShadow } from '../../styleDecoding';
import {
  BLEND_MODES,
  dashArray,
  numOf,
  oneOf,
  optionalOneOf,
  SHAPE_FONT_WEIGHTS,
  SHAPE_STROKE_STYLES,
  strokePaint,
  TEXT_ALIGNS,
  VERTICAL_ALIGNS,
} from './values';

function shapeTypeOf(value: string | undefined): ShapeType {
  return (value || 'rectangle') as ShapeType;
}

export function shapeObject(e: SflCanvasObject, shaders: ReadonlyMap<string, Shader>) {
  const p = e.props;
  const isText = e.kind === 'text';
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
    fillColor: decodeColor(p.fill ?? (isText ? 'none' : undefined)),
    strokeColor: strokePaint(p.stroke ?? (isText ? 'none' : undefined)),
    isText: isText || undefined,
    strokeWidth: numOf(p.strokeWidth),
    textColor: p.textColor,
    fontSize: numOf(p.fontSize),
    fontWeight: p.fontWeight === undefined ? undefined : oneOf(p.fontWeight, SHAPE_FONT_WEIGHTS, 'normal'),
    letterSpacing: numOf(p.letterSpacing),
    lineHeight: numOf(p.lineHeight),
    fontFamily: p.fontFamily,
    textAlign: optionalOneOf(p.textAlign, TEXT_ALIGNS),
    textVerticalAlign: optionalOneOf(p.verticalAlign, VERTICAL_ALIGNS),
    cornerRadius: numOf(p.cornerRadius),
    shadowStyle: decodeShadow(p.shadow),
    dash: dashArray(p.dash),
    strokeStyle: optionalOneOf(p.strokeStyle, SHAPE_STROKE_STYLES),
    opacity: numOf(p.opacity),
    blur: numOf(p.blur),
    blend: optionalOneOf(p.blend, BLEND_MODES),
    parentFrameId: e.parentFrameId,
    order: e.order,
    sourceIndex: e.sourceIndex,
    shader: p.shader ? shaders.get(p.shader) : undefined,
  };
}
