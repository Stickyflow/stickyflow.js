import { portToPoint, type Rect, type Side } from '../../model/geometry/routing';
import type { OwnerRef } from '../../viewer';
import { nearestPort, sideFromDirection } from '../linkEndpoint/geometry';

const HOVER_MARGIN_PX = 15;
const MAGNET_RADIUS_PX = 16;

export interface LinkCandidate {
  owner: OwnerRef;
  bounds: Rect;
}

export interface LinkHit {
  owner: OwnerRef;
  side: Side;
  offset: number;
}

export interface LinkTarget {
  point: { x: number; y: number };
  side: Side;
  hit: LinkHit | null;
  bounds: Rect | null;
}

function distanceToRect(bounds: Rect, point: { x: number; y: number }): number {
  const dx = Math.max(bounds.x - point.x, 0, point.x - (bounds.x + bounds.width));
  const dy = Math.max(bounds.y - point.y, 0, point.y - (bounds.y + bounds.height));
  return Math.hypot(dx, dy);
}

function pickCandidate(
  candidates: readonly LinkCandidate[],
  point: { x: number; y: number },
  margin: number,
): LinkCandidate | null {
  let containing: LinkCandidate | null = null;
  let nearby: LinkCandidate | null = null;
  let nearbyDistance = Infinity;
  for (const candidate of candidates) {
    const distance = distanceToRect(candidate.bounds, point);
    if (distance === 0) {
      containing = candidate;
    } else if (distance <= margin && distance < nearbyDistance) {
      nearby = candidate;
      nearbyDistance = distance;
    }
  }
  return containing ?? nearby;
}

export function snapPort(
  bounds: Rect,
  point: { x: number; y: number },
  unitsPerPx: number,
): { side: Side; offset: number } {
  const port = nearestPort(bounds, point);
  const sideLength = port.side === 'top' || port.side === 'bottom' ? bounds.width : bounds.height;
  const distanceFromCenter = Math.abs(port.offset - 0.5) * sideLength;
  return distanceFromCenter <= MAGNET_RADIUS_PX * unitsPerPx ? { side: port.side, offset: 0.5 } : port;
}

export function resolveLinkTarget(
  candidates: readonly LinkCandidate[],
  fixedPoint: { x: number; y: number },
  point: { x: number; y: number },
  unitsPerPx: number,
): LinkTarget {
  const candidate = pickCandidate(candidates, point, HOVER_MARGIN_PX * unitsPerPx);
  if (!candidate) {
    return { point, side: sideFromDirection(point, fixedPoint), hit: null, bounds: null };
  }
  const port = snapPort(candidate.bounds, point, unitsPerPx);
  return {
    point: portToPoint(candidate.bounds, port),
    side: port.side,
    hit: { owner: candidate.owner, side: port.side, offset: port.offset },
    bounds: candidate.bounds,
  };
}
