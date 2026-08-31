import type { Link, PathType } from '../../links'

import { routeCubic, routeOrthogonal, roundOrthogonalPath, type PathSegment, type Side } from '../router'



type Point = { x: number; y: number }



function pathFromWaypoints(from: Point, waypoints: Point[], to: Point): { points: number[]; segments: PathSegment[] } {
  const corners: Point[] = [from, ...waypoints, to]
  const flat: number[] = []
  for (const p of corners) flat.push(p.x, p.y)

  const segments: PathSegment[] = []
  for (let i = 0; i < flat.length - 2; i += 2) {
    const start = { x: flat[i], y: flat[i + 1] }
    const end = { x: flat[i + 2], y: flat[i + 3] }
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    segments.push({
      start,
      end,
      midpoint,
      originalMidpoint: midpoint,
      isHorizontal: Math.abs(end.x - start.x) > Math.abs(end.y - start.y),
      canMove: false,
    })
  }

  return { points: roundOrthogonalPath(flat, 10), segments }
}

export interface PathPointsResult {
  points: number[]
  segments: PathSegment[]
}

/** Rounded-corner SVG path data for an orthogonal route's segments — shared by
 *  the static renderer (buildRenderScene.ts) and a live drag preview
 *  (stickyflow/interaction's moveDrag.ts), so a link doesn't visibly change
 *  corner style between "being dragged" and "just rendered". */
export function roundedOrthogonalPathData(segments: PathSegment[], radius: number): string {
  if (!segments.length) return ''
  const raw = [segments[0].start, ...segments.map(segment => segment.end)]
  const points = raw.filter((point, index) => index === 0 || point.x !== raw[index - 1].x || point.y !== raw[index - 1].y)
  const corners = points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) return true
    const previous = points[index - 1], next = points[index + 1]
    return !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y))
  })
  if (corners.length < 2) return ''
  let d = `M ${corners[0].x} ${corners[0].y}`
  for (let index = 1; index < corners.length - 1; index++) {
    const previous = corners[index - 1], corner = corners[index], next = corners[index + 1]
    const incoming = Math.hypot(corner.x - previous.x, corner.y - previous.y)
    const outgoing = Math.hypot(next.x - corner.x, next.y - corner.y)
    if (incoming === 0 || outgoing === 0) {
      // A degenerate (zero-length) segment on either side of this corner —
      // no direction vector to round along, so pass straight through it
      // rather than dividing by zero (previously produced a NaN path — hit
      // in practice once alignment-guide snapping made two connected
      // shapes' edges land in exact/near-exact alignment, which is exactly
      // when this can happen). Same defensive shape router.ts's own
      // roundOrthogonalPath already uses for its equivalent `r <= 0` case.
      d += ` L ${corner.x} ${corner.y}`
      continue
    }
    const r = Math.min(radius, incoming * .4, outgoing * .4)
    const before = { x: corner.x + (previous.x - corner.x) / incoming * r, y: corner.y + (previous.y - corner.y) / incoming * r }
    const after = { x: corner.x + (next.x - corner.x) / outgoing * r, y: corner.y + (next.y - corner.y) / outgoing * r }
    d += ` L ${before.x} ${before.y} Q ${corner.x} ${corner.y} ${after.x} ${after.y}`
  }
  const last = corners[corners.length - 1]
  return `${d} L ${last.x} ${last.y}`
}

const ORTHOGONAL_EPSILON = 0.5 // px tolerance for float rounding

// Guarantees the "orthogonal" pathType actually lives up to its name: every segment
// must be purely horizontal or vertical (a right angle at each corner). Stored
// waypoints (A* obstacle-avoidance pass) or a user-dragged segmentOffsets array are
// both expressed relative to the geometry that existed when they were computed - if
// an endpoint gets reconnected, or an entity's effective bounds were computed
// inconsistently between the drag-preview and the persisted commit (see
// TEXT_FALLBACK_WIDTH/HEIGHT), that geometry can silently drift out of sync and
// produce a segment that's neither axis-aligned, i.e. a visibly "crooked" link. This
// is the structural backstop: never render that - fall back to the always-correct
// default route instead of showing (or persisting the impression of) a broken path.
function isAxisAligned(segments: PathSegment[]): boolean {
  return segments.every((s) => {
    const dx = Math.abs(s.end.x - s.start.x)
    const dy = Math.abs(s.end.y - s.start.y)
    return dx <= ORTHOGONAL_EPSILON || dy <= ORTHOGONAL_EPSILON
  })
}

export const getPathPoints = (
  link: Link,
  effectiveFrom: Point,
  effectiveTo: Point,
  pathType: PathType
): PathPointsResult => {
  let fromSide: Side = 'right'
  let toSide: Side = 'left'

  if (link.fromPoint && 'side' in link.fromPoint) {
    fromSide = link.fromPoint.side
  } else {
    // Fallback: Calculate best side based on relative position
    const dx = effectiveTo.x - effectiveFrom.x
    const dy = effectiveTo.y - effectiveFrom.y
    const angle = Math.atan2(dy, dx)
    if (angle >= -Math.PI / 4 && angle < Math.PI / 4) fromSide = 'right'
    else if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) fromSide = 'bottom'
    else if (angle >= -3 * Math.PI / 4 && angle < -Math.PI / 4) fromSide = 'top'
    else fromSide = 'left'
  }

  if (link.toPoint && 'side' in link.toPoint) {
    toSide = link.toPoint.side
  } else {
    // Fallback: Calculate best side based on relative position (opposite direction)
    const dx = effectiveFrom.x - effectiveTo.x
    const dy = effectiveFrom.y - effectiveTo.y
    const angle = Math.atan2(dy, dx)
    if (angle >= -Math.PI / 4 && angle < Math.PI / 4) toSide = 'right'
    else if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) toSide = 'bottom'
    else if (angle >= -3 * Math.PI / 4 && angle < -Math.PI / 4) toSide = 'top'
    else toSide = 'left'
  }

  if (pathType === 'curved') {
    const { p0, p1, p2, p3 } = routeCubic(effectiveFrom, effectiveTo, fromSide, toSide, {
      min: 35,
      max: 90,
      sMult: 0.5,
    })
    return { points: [...p0, ...p1, ...p2, ...p3], segments: [] }
  }

  if (pathType === 'orthogonal') {
    const entityEdges = { fromEdge: fromSide, toEdge: toSide }

    // 🧭 Obstacle-avoiding route takes precedence: draw the explicit polyline verbatim -
    // but only while it's still actually orthogonal (see isAxisAligned above). Stale
    // waypoints (endpoint reconnected/entity moved since they were computed) fall
    // through to the guaranteed-clean default below instead of rendering a diagonal.
    if (link.waypoints && link.waypoints.length > 0) {
      const waypointResult = pathFromWaypoints(effectiveFrom, link.waypoints, effectiveTo)
      if (isAxisAligned(waypointResult.segments)) return waypointResult
    }

    const result = routeOrthogonal(effectiveFrom, effectiveTo, fromSide, toSide, link.segmentOffsets, entityEdges)
    if (isAxisAligned(result.segments)) return result

    // A stale/mismatched segmentOffsets pushed a segment off-axis - recompute the
    // same default template with no manual offsets applied (always axis-aligned by
    // construction) rather than show the broken result.
    return routeOrthogonal(effectiveFrom, effectiveTo, fromSide, toSide, undefined, entityEdges)
  }

  return { points: [effectiveFrom.x, effectiveFrom.y, effectiveTo.x, effectiveTo.y], segments: [] }
}

