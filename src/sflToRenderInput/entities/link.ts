import type { SflLinkOut } from '../../sfl/sflToCanvasState';
import { MARKER_TYPES, numOf, optionalOneOf, PATH_TYPES, STROKE_STYLES, strokePaint } from './values';

export function linkObject(l: SflLinkOut) {
  const p = l.props;
  return {
    id: l.id,
    type: 'link',
    from: l.fromId,
    to: l.toId,
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
    },
    startMarker: optionalOneOf(p.markerStart, MARKER_TYPES),
    endMarker: optionalOneOf(p.markerEnd, MARKER_TYPES),
    segmentOffsets: l.segments,
    fromPoint: l.fromPort
      ? { port: l.fromPort, isPort: true as const }
      : l.fromSide
        ? { side: l.fromSide, offset: l.fromFraction }
        : undefined,
    toPoint: l.toPort
      ? { port: l.toPort, isPort: true as const }
      : l.toSide
        ? { side: l.toSide, offset: l.toFraction }
        : undefined,
    order: l.order,
  };
}
