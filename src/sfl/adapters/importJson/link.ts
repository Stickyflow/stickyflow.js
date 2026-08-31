import type { SflLinkOut } from '../../sflToCanvasState'
import { decodeColor } from '../decodeStyles'
import { numOf } from './values'

export function linkObject(l: SflLinkOut): any {
  const p = l.props;
  return {
    id: l.id,
    type: 'link',
    from: l.fromId, to: l.toId, fromId: l.fromId, toId: l.toId,
    text: l.text ?? '',
    showText: p.showText !== 'false',
    weight: numOf(p.weight),
    showWeight: p.showWeight !== 'false',
    style: {
      pathType: p.route,
      color: decodeColor(p.stroke),
      strokeWidth: numOf(p.strokeWidth),
      strokeStyle: p.strokeStyle,
      opacity: p.opacity !== undefined ? numOf(p.opacity) : undefined,
      fontSize: numOf(p.fontSize),
      fontFamily: p.fontFamily,
      startLabel: p.startLabel,
      endLabel: p.endLabel,
    },
    startMarker: p.markerStart,
    endMarker: p.markerEnd,
    segmentOffsets: l.segments,
    // Named ports take precedence over side/fraction anchors.
    fromPoint: l.fromPort ? { port: l.fromPort, isPort: true } : l.fromSide ? { side: l.fromSide, offset: l.fromFraction } : undefined,
    toPoint: l.toPort ? { port: l.toPort, isPort: true } : l.toSide ? { side: l.toSide, offset: l.toFraction } : undefined,
    order: l.order,
  };
}
