import type { Side } from '../../../../../model/geometry/types';
import { routeCubic } from './cubic';
import type { LinkRoute, LinkRoutePoint } from './types';

export function calculateCurvedLinkRoute(
  from: LinkRoutePoint,
  to: LinkRoutePoint,
  fromSide: Side,
  toSide: Side,
): LinkRoute {
  const { p0, p1, p2, p3 } = routeCubic(from, to, fromSide, toSide, {
    min: 35,
    max: 90,
    perpendicularScale: 0.5,
  });
  return { points: [...p0, ...p1, ...p2, ...p3], segments: [] };
}
