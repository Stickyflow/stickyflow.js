import type { Shader } from '../../../model/shader';
import type { ShapeImage, ShapeType } from '../../../model/shape';
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

const IMAGE_FITS = ['cover', 'contain', 'fill'] as const;

function shapeTypeOf(value: string | undefined): ShapeType {
  return (value || 'rectangle') as ShapeType;
}

function numbers(value: string | undefined, count: number): number[] | undefined {
  const parts = value?.split(',').map(Number);
  return parts?.length === count && parts.every(Number.isFinite) ? parts : undefined;
}

function imageOf(p: Record<string, string>): ShapeImage {
  const size = numbers(p.imageSize, 2);
  const crop = numbers(p.crop, 4);
  return {
    src: p.src,
    fit: oneOf(p.fit, IMAGE_FITS, 'cover'),
    pixels: size && size[0] > 0 && size[1] > 0 ? [size[0], size[1]] : undefined,
    crop: crop && crop[2] > 0 && crop[3] > 0 ? { x: crop[0], y: crop[1], width: crop[2], height: crop[3] } : undefined,
  };
}

export function shapeObject(e: SflCanvasObject, shaders: ReadonlyMap<string, Shader>) {
  const p = e.props;
  const isText = e.kind === 'text';
  const isImage = e.kind === 'image';
  const unpainted = isText || isImage;
  return {
    id: e.id,
    type: 'shape',
    text: e.text ?? null,
    // A picture with a corner radius and no form of its own is a rounded one, or the radius would do nothing.
    shapeType: shapeTypeOf(e.shapeType ?? (isImage && p.cornerRadius ? 'rounded_rectangle' : undefined)),
    symbol: e.symbol,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    w: e.width,
    h: e.height,
    rotation: e.rotation ?? 0,
    fillColor: decodeColor(p.fill ?? (unpainted ? 'none' : undefined)),
    strokeColor: strokePaint(p.stroke ?? (unpainted ? 'none' : undefined)),
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
    image: isImage && p.src ? imageOf(p) : undefined,
  };
}
