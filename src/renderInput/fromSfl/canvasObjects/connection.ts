import type { Connection } from '../../../model/connection';
import type { SflConnectionOut } from '../../../sflSemantic/sflToCanvasState';
import { numOf, optionalOneOf, PATH_TYPES, STROKE_STYLES, strokePaint } from './values';

export function connectionObject(c: SflConnectionOut): Connection {
  const p = c.props;
  return {
    id: c.id,
    fromId: c.fromId,
    toId: c.toId,
    fromFace: c.fromFace,
    toFace: c.toFace,
    order: c.order,
    style: {
      pathType: optionalOneOf(p.route, PATH_TYPES),
      color: strokePaint(p.stroke),
      strokeWidth: numOf(p.strokeWidth),
      strokeStyle: optionalOneOf(p.strokeStyle, STROKE_STYLES),
      opacity: p.opacity !== undefined ? numOf(p.opacity) : undefined,
    },
  };
}
