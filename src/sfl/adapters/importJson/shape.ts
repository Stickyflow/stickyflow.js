import type { SflEntityOut } from '../../sflToCanvasState';
import { decodeColor, decodeShadow } from '../decodeStyles';
import { numOf, safeJson } from './values';

export function shapeObject(e: SflEntityOut) {
  const p = e.props;
  return {
    id: e.id,
    type: 'shape',
    text: e.text ?? null,
    shapeType: e.shapeType ?? 'rectangle',
    symbol: e.symbol,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    w: e.width,
    h: e.height,
    rotation: e.rotation ?? 0,
    fillColor: decodeColor(p.fill),
    strokeColor: decodeColor(p.stroke),
    strokeWidth: numOf(p.strokeWidth),
    textColor: p.textColor,
    fontSize: numOf(p.fontSize),
    fontWeight: p.fontWeight,
    fontFamily: p.fontFamily,
    textAlign: p.textAlign,
    textVerticalAlign: p.verticalAlign,
    cornerRadius: numOf(p.cornerRadius),
    shadowStyle: decodeShadow(p.shadow),
    dash: p.dash ? safeJson(p.dash) : undefined,
    strokeStyle: p.strokeStyle,
    shapeStyle: p.opacity !== undefined ? { opacity: numOf(p.opacity) } : undefined,
    imageUrl: p.src,
    imageFit: p.fit as 'cover' | 'contain' | undefined,
    parent_frame_id: e.parentFrameId,
    order: e.order,
  };
}
