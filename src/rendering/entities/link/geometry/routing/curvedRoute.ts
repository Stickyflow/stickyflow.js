import { routeCubic, type Side } from '../../../../../model/geometry/routing';
import type { LinkRoute, LinkRoutePoint } from './types';

export function calculateCurvedLinkRoute(
  from: LinkRoutePoint,
  to: LinkRoutePoint,
  fromSide: Side,
  toSide: Side,
): LinkRoute {
  const { p0, p1, p2, p3 } = routeCubic(from, to, fromSide, toSide, { min: 35, max: 90, sMult: 0.5 });
  return { points: [...p0, ...p1, ...p2, ...p3], segments: [] };
}
