import type { Link, PathType } from '../../../../model/link';
import { calculateCurvedLinkRoute } from './routing/curvedRoute';
import { calculateOrthogonalLinkRoute } from './routing/orthogonalRoute';
import { connectionSides } from './routing/sides';
import { calculateStraightLinkRoute } from './routing/straightRoute';
import type { LinkRoute, LinkRoutePoint } from './routing/types';

export type { LinkRoute } from './routing/types';
export function calculateLinkRoute(
  link: Link,
  effectiveFrom: LinkRoutePoint,
  effectiveTo: LinkRoutePoint,
  pathType: PathType,
): LinkRoute {
  const { fromSide, toSide } = connectionSides(link, effectiveFrom, effectiveTo);
  if (pathType === 'curved') {
    return calculateCurvedLinkRoute(effectiveFrom, effectiveTo, fromSide, toSide);
  }
  if (pathType === 'orthogonal') {
    return calculateOrthogonalLinkRoute(link, effectiveFrom, effectiveTo, fromSide, toSide);
  }
  return calculateStraightLinkRoute(effectiveFrom, effectiveTo);
}
