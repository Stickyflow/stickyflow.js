import type { Side } from '../../../geometry/routing';
import type { Link } from '../../types';
import type { ConnectionPoint } from './types';

function facingSide(from: ConnectionPoint, to: ConnectionPoint): Side {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
    return 'right';
  }
  if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
    return 'bottom';
  }
  if (angle >= (-3 * Math.PI) / 4 && angle < -Math.PI / 4) {
    return 'top';
  }
  return 'left';
}

export function connectionSides(
  link: Link,
  from: ConnectionPoint,
  to: ConnectionPoint,
): { fromSide: Side; toSide: Side } {
  const fromSide = link.fromPoint && 'side' in link.fromPoint ? link.fromPoint.side : facingSide(from, to);
  const toSide = link.toPoint && 'side' in link.toPoint ? link.toPoint.side : facingSide(to, from);
  return { fromSide, toSide };
}
