import type { Link } from '../../../model/link';
import type { SflLinkOut } from '../../../sflSemantic/sflToCanvasState';
import { decodeShadow } from '../../styleDecoding';
import { MARKER_TYPES, numOf, optionalOneOf, PATH_TYPES, STROKE_STYLES, strokePaint } from './values';

export function linkObject(l: SflLinkOut): Link {
  const p = l.props;
  return {
    id: l.id,
    fromId: l.fromId,
    toId: l.toId,
    text: l.text ?? '',
    showText: p.showText !== 'false',
    weight: numOf(p.weight),
    showWeight: p.showWeight !== 'false',
    style: {
      pathType: optionalOneOf(p.route, PATH_TYPES),
      color: strokePaint(p.stroke),
      strokeWidth: numOf(p.strokeWidth),
      strokeStyle: optionalOneOf(p.strokeStyle, STROKE_STYLES),
      opacity: p.opacity !== undefined ? numOf(p.opacity) : undefined,
      fontSize: numOf(p.fontSize),
      fontFamily: p.fontFamily,
      startLabel: p.startLabel,
      endLabel: p.endLabel,
      shadow: decodeShadow(p.shadow),
    },
    startMarker: optionalOneOf(p.markerStart, MARKER_TYPES),
    endMarker: optionalOneOf(p.markerEnd, MARKER_TYPES),
    segmentOffsets: l.segments,
    fromPoint: l.fromPort
      ? { kind: 'port' as const, port: l.fromPort }
      : l.fromSide
        ? { kind: 'side' as const, side: l.fromSide, offset: l.fromFraction }
        : undefined,
    toPoint: l.toPort
      ? { kind: 'port' as const, port: l.toPort }
      : l.toSide
        ? { kind: 'side' as const, side: l.toSide, offset: l.toFraction }
        : undefined,
    order: l.order,
    sourceIndex: l.sourceIndex,
  };
}
