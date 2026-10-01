import type { Side } from '../../../../../model/geometry/types';
import type { Link } from '../../../../../model/link';
import type { LinkRoutePoint } from './types';

function facingSide(from: LinkRoutePoint, to: LinkRoutePoint): Side {
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
  from: LinkRoutePoint,
  to: LinkRoutePoint,
): { fromSide: Side; toSide: Side } {
  const fromSide = link.fromPoint?.kind === 'side' ? link.fromPoint.side : facingSide(from, to);
  const toSide = link.toPoint?.kind === 'side' ? link.toPoint.side : facingSide(to, from);
  return { fromSide, toSide };
}
