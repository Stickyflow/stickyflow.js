import type { LinkRoute, LinkRoutePoint } from './types';

export function calculateStraightLinkRoute(from: LinkRoutePoint, to: LinkRoutePoint): LinkRoute {
  return { points: [from.x, from.y, to.x, to.y], segments: [] };
}
