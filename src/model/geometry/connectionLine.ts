// Pure geometry helpers for ConnectionLine: path routing, arrow/marker
// transforms and midpoint calculation, extracted out of the component.
import type { Link, PathType, StrokeStyle } from '../links'
import type { GradientColor } from '../colors'
import { routeCubic, routeOrthogonal, roundOrthogonalPath, type PathSegment, type Side } from './router'

type Point = { x: number; y: number }

// Build an OrthoPath-shaped result from an explicit orthogonal polyline
// [from, ...waypoints, to]. Used when a link carries obstacle-avoiding waypoints.
// Segments are marked non-movable: these routes are machine-generated; users
// re-route by dragging endpoints (which clears the waypoints).
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

// Compute Konva linear-gradient stroke props for a Line.
// Unlike shapes (which have a fixed width/height to project an abstract angle onto),
// a link's orientation varies per-link - an absolute angle would often run perpendicular
// to the line itself, collapsing every point to the same gradient stop (solid color).
// So the gradient axis always runs along the line, from its first to its last point.
// Returns {} for solid colors so the plain `stroke` prop is used instead.
export const getLinkGradientStrokeProps = (
  colorValue: string | GradientColor | null | undefined,
  points: number[]
) => {
  if (!colorValue || typeof colorValue === 'string' || colorValue.type !== 'gradient') {
    return {}
  }

  if (points.length < 4) {
    return {}
  }

  const colorStops: (number | string)[] = []
  colorValue.stops.forEach(stop => {
    colorStops.push(stop.position / 100)
    colorStops.push(stop.color)
  })

  return {
    strokeLinearGradientStartPoint: { x: points[0], y: points[1] },
    strokeLinearGradientEndPoint: { x: points[points.length - 2], y: points[points.length - 1] },
    strokeLinearGradientColorStops: colorStops,
  }
}

// Resolve the connection path points from the link's stored connection sides
// (or a fallback based on relative position) and the selected path type.
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

// Stroke dash pattern for dashed/dotted lines. Dash sizes derive from
// strokeWidth, so they scale naturally with it.
export const getDashArray = (strokeWidth: number, strokeStyle: StrokeStyle): number[] | undefined => {
  switch (strokeStyle) {
    case 'dashed':
      return [strokeWidth * 8, strokeWidth * 4]
    case 'dotted':
      return [strokeWidth * 2, strokeWidth * 3]
    case 'solid':
    default:
      return undefined
  }
}

// Calculate arrow points based on direction, using an orthogonal approach for curved paths.
export const getArrowPoints = (
  points: number[],
  pathType: PathType,
  direction: 'forward' | 'backward',
  from: Point,
  to: Point
): number[] => {
  if (pathType === 'curved') {
    const numPoints = points.length
    if (direction === 'forward') {
      const lastX = points[numPoints - 2]
      const lastY = points[numPoints - 1]
      const secondLastX = points[numPoints - 4]
      const secondLastY = points[numPoints - 3]

      const dx = lastX - secondLastX
      const dy = lastY - secondLastY
      const length = Math.sqrt(dx * dx + dy * dy)

      if (length > 0) {
        const normalizedDx = dx / length
        const normalizedDy = dy / length
        const arrowStartX = lastX - normalizedDx * 8
        const arrowStartY = lastY - normalizedDy * 8
        return [arrowStartX, arrowStartY, lastX, lastY]
      }

      return [secondLastX, secondLastY, lastX, lastY]
    } else {
      const firstX = points[0]
      const firstY = points[1]
      const secondX = points[2]
      const secondY = points[3]

      const dx = firstX - secondX
      const dy = firstY - secondY
      const length = Math.sqrt(dx * dx + dy * dy)

      if (length > 0) {
        const normalizedDx = dx / length
        const normalizedDy = dy / length
        const arrowStartX = firstX - normalizedDx * 8
        const arrowStartY = firstY - normalizedDy * 8
        return [arrowStartX, arrowStartY, firstX, firstY]
      }

      return [secondX, secondY, firstX, firstY]
    }
  } else {
    if (direction === 'forward') {
      const numPoints = points.length
      if (numPoints >= 4) {
        return [points[numPoints - 4], points[numPoints - 3], points[numPoints - 2], points[numPoints - 1]]
      }
      return [points[0] || from.x, points[1] || from.y, points[2] || to.x, points[3] || to.y]
    } else {
      return [points[2] || to.x, points[3] || to.y, points[0] || from.x, points[1] || from.y]
    }
  }
}

// Calculate the actual midpoint of the connection line path (for label/toolbar/badge positioning).
export const getLineMidpoint = (
  points: number[],
  pathType: PathType,
  effectiveFrom: Point,
  effectiveTo: Point
): Point => {
  if (pathType === 'curved') {
    // For bezier curves, calculate point at t=0.5
    const [x0, y0, x1, y1, x2, y2, x3, y3] = points
    const t = 0.5
    const mt = 1 - t
    const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3
    const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3
    return { x, y }
  } else if (pathType === 'orthogonal') {
    // For orthogonal paths, calculate actual path midpoint along segments
    let totalLength = 0
    const segments: Array<{ start: Point; end: Point; length: number }> = []

    for (let i = 0; i < points.length - 2; i += 2) {
      const start = { x: points[i], y: points[i + 1] }
      const end = { x: points[i + 2], y: points[i + 3] }
      const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2)
      totalLength += length
      segments.push({ start, end, length })
    }

    const halfLength = totalLength / 2
    let accumulatedLength = 0

    for (const segment of segments) {
      if (accumulatedLength + segment.length >= halfLength) {
        const remainingLength = halfLength - accumulatedLength
        const t = remainingLength / segment.length
        return {
          x: segment.start.x + t * (segment.end.x - segment.start.x),
          y: segment.start.y + t * (segment.end.y - segment.start.y)
        }
      }
      accumulatedLength += segment.length
    }

    // Fallback to geometric center if no segments
    return {
      x: (effectiveFrom.x + effectiveTo.x) / 2,
      y: (effectiveFrom.y + effectiveTo.y) / 2
    }
  } else {
    // For straight lines, use simple geometric center
    return {
      x: (effectiveFrom.x + effectiveTo.x) / 2,
      y: (effectiveFrom.y + effectiveTo.y) / 2
    }
  }
}

// Calculate actual arrow endpoints (used as drag-handle positions for LinkTransformer)
export const getActualArrowEndpoints = (
  points: number[],
  pathType: PathType,
  from: Point,
  to: Point
): { actualFrom: Point; actualTo: Point } => {
  const forwardArrow = getArrowPoints(points, pathType, 'forward', from, to)
  const backwardArrow = getArrowPoints(points, pathType, 'backward', from, to)

  const actualTo = { x: forwardArrow[2], y: forwardArrow[3] }
  const actualFrom = { x: backwardArrow[2], y: backwardArrow[3] }

  return { actualFrom, actualTo }
}

// Calculate marker position and rotation at the start or end of the path
export const getMarkerTransform = (
  points: number[],
  direction: 'start' | 'end'
): { x: number; y: number; rotation: number } => {
  const numPoints = points.length
  let x: number, y: number, angle: number

  if (direction === 'end') {
    // End marker at last point
    x = points[numPoints - 2]
    y = points[numPoints - 1]

    if (numPoints >= 4) {
      const dx = x - points[numPoints - 4]
      const dy = y - points[numPoints - 3]
      angle = Math.atan2(dy, dx) * (180 / Math.PI)
    } else {
      angle = 0
    }
  } else {
    // Start marker at first point, rotated 180° to point away from the line
    x = points[0]
    y = points[1]

    if (numPoints >= 4) {
      const dx = points[2] - x
      const dy = points[3] - y
      angle = Math.atan2(dy, dx) * (180 / Math.PI) + 180
    } else {
      angle = 180
    }
  }

  return { x, y, rotation: angle }
}

// ---- Link label measurement & line-gap helpers ----

const LABEL_MAX_WIDTH = 250 // px - max width before label text wraps
// Arial's actual average advance width sits around 0.55-0.6em for mixed-case
// text; 0.65 keeps a safety margin for wider (bold/uppercase-heavy) labels
// without the box ballooning far past what the glyphs need, which is what
// was cutting a much bigger gap into the line than the visible text.
const LABEL_CHAR_WIDTH_RATIO = 0.65 // approx. average character width relative to font size
const LABEL_LINE_HEIGHT_RATIO = 1.4 // line height relative to font size
const LABEL_GAP_PADDING = 3 // extra clearance (px) around the label where the line is cut

// Estimate the rendered footprint of a (possibly multi-line, wrapping) link label
// at a given font size. Used both to size the label/edit overlay and to size the
// gap cut into the line behind it.
export const measureLinkLabel = (text: string, fontSize: number): { width: number; height: number } => {
  const charWidth = fontSize * LABEL_CHAR_WIDTH_RATIO
  const lineHeight = fontSize * LABEL_LINE_HEIGHT_RATIO
  const lines = text.split('\n')
  const maxLineLength = Math.max(...lines.map(line => line.length))
  // Floor only guards against near-zero width for 1-char labels; real
  // content width (clamped to LABEL_MAX_WIDTH, where wrapping kicks in)
  // otherwise drives the gap so short words like "Ja"/"Nein" don't reserve
  // far more space in the line than the text actually needs.
  const width = Math.max(fontSize * 1.8, Math.min(LABEL_MAX_WIDTH, maxLineLength * charWidth + 10))
  const estimatedLines = lines.reduce((total, line) => {
    return total + Math.max(1, Math.ceil(line.length * charWidth / LABEL_MAX_WIDTH))
  }, 0)
  const height = Math.max(lineHeight + 2, estimatedLines * lineHeight + 4)
  return { width, height }
}

const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})

// Cubic bezier point and De Casteljau subdivision at parameter t.
const cubicBezierPoint = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const mt = 1 - t
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  }
}

const splitCubicBezier = (p0: Point, p1: Point, p2: Point, p3: Point, t: number) => {
  const a = lerpPoint(p0, p1, t)
  const b = lerpPoint(p1, p2, t)
  const c = lerpPoint(p2, p3, t)
  const d = lerpPoint(a, b, t)
  const e = lerpPoint(b, c, t)
  const f = lerpPoint(d, e, t)
  return { left: [p0, a, d, f], right: [f, e, c, p3] }
}

// Walk a polyline by arc length, returning the point and the flat-array index of
// the segment (points[segIndex], points[segIndex+1]) it falls on.
const pointAtArcLength = (points: number[], targetLength: number): { point: Point; segIndex: number } => {
  const lastIndex = points.length - 2
  if (targetLength <= 0) return { point: { x: points[0], y: points[1] }, segIndex: 0 }

  let acc = 0
  for (let i = 0; i < lastIndex; i += 2) {
    const start = { x: points[i], y: points[i + 1] }
    const end = { x: points[i + 2], y: points[i + 3] }
    const segLen = Math.hypot(end.x - start.x, end.y - start.y)
    if (acc + segLen >= targetLength) {
      const t = segLen === 0 ? 0 : (targetLength - acc) / segLen
      return { point: lerpPoint(start, end, t), segIndex: i }
    }
    acc += segLen
  }
  return { point: { x: points[lastIndex], y: points[lastIndex + 1] }, segIndex: lastIndex }
}

const polylineLength = (points: number[]): number => {
  let total = 0
  for (let i = 0; i < points.length - 2; i += 2) {
    total += Math.hypot(points[i + 2] - points[i], points[i + 3] - points[i + 1])
  }
  return total
}

export interface LabelGapSplit {
  before: number[] | null // points for the segment before the label, or null if fully covered by the gap
  after: number[] | null  // points for the segment after the label, or null if fully covered by the gap
  bezier: boolean         // whether before/after should be rendered with bezier=true
}

// Always leave at least this much visible line on each side of the label gap,
// even when the label's own footprint would otherwise consume the entire
// path (e.g. a short cross-lane hop with a long label) - without this floor,
// both the "before" and "after" segments below resolve to null and the
// label ends up floating with no connecting line at all.
const MIN_VISIBLE_STUB = 10

// Split a link's path into a "before" and "after" segment around a gap centered
// on the path midpoint, sized to fit the text label (so the line doesn't run
// through the label). Returns null if the path has no length to split.
export const splitPathAroundLabel = (
  points: number[],
  pathType: PathType,
  gapWidth: number,
  gapHeight: number
): LabelGapSplit | null => {
  const gapHalfWidth = (gapWidth + LABEL_GAP_PADDING) / 2
  const gapHalfHeight = (gapHeight + LABEL_GAP_PADDING) / 2

  if (pathType === 'curved') {
    if (points.length < 8) return null
    const p0 = { x: points[0], y: points[1] }
    const p1 = { x: points[2], y: points[3] }
    const p2 = { x: points[4], y: points[5] }
    const p3 = { x: points[6], y: points[7] }

    const SAMPLES = 40
    const arcLengths: number[] = [0]
    let prev = p0
    for (let i = 1; i <= SAMPLES; i++) {
      const t = i / SAMPLES
      const pt = cubicBezierPoint(p0, p1, p2, p3, t)
      arcLengths.push(arcLengths[i - 1] + Math.hypot(pt.x - prev.x, pt.y - prev.y))
      prev = pt
    }
    const total = arcLengths[SAMPLES]
    if (total === 0) return null
    const half = total / 2

    // Direction of travel at the midpoint (bezier derivative at t=0.5), used to
    // project the label's bounding box onto the line's local direction.
    const dx = 0.75 * (p1.x - p0.x) + 1.5 * (p2.x - p1.x) + 0.75 * (p3.x - p2.x)
    const dy = 0.75 * (p1.y - p0.y) + 1.5 * (p2.y - p1.y) + 0.75 * (p3.y - p2.y)
    const dirLen = Math.hypot(dx, dy)
    const ux = dirLen === 0 ? 1 : Math.abs(dx) / dirLen
    const uy = dirLen === 0 ? 0 : Math.abs(dy) / dirLen
    const gapHalfLength = Math.min(gapHalfWidth * ux + gapHalfHeight * uy, Math.max(0, half - MIN_VISIBLE_STUB))

    const tAtLength = (target: number): number => {
      if (target <= 0) return 0
      if (target >= total) return 1
      for (let i = 1; i <= SAMPLES; i++) {
        if (arcLengths[i] >= target) {
          const segFrac = (target - arcLengths[i - 1]) / (arcLengths[i] - arcLengths[i - 1] || 1)
          return (i - 1 + segFrac) / SAMPLES
        }
      }
      return 1
    }

    const t1 = tAtLength(half - gapHalfLength)
    const t2 = tAtLength(half + gapHalfLength)

    const before = t1 > 0.01 ? splitCubicBezier(p0, p1, p2, p3, t1).left.flatMap(p => [p.x, p.y]) : null
    const after = t2 < 0.99 ? splitCubicBezier(p0, p1, p2, p3, t2).right.flatMap(p => [p.x, p.y]) : null

    return { before, after, bezier: true }
  }

  // Straight / orthogonal: treat points as a polyline.
  if (points.length < 4) return null

  const total = polylineLength(points)
  if (total === 0) return null
  const half = total / 2

  // Direction of the segment the midpoint falls on, used to project the label's
  // bounding box onto the line's local direction (for orthogonal paths this is
  // always purely horizontal or vertical).
  const mid = pointAtArcLength(points, half)
  const segStart = { x: points[mid.segIndex], y: points[mid.segIndex + 1] }
  const segEnd = { x: points[mid.segIndex + 2], y: points[mid.segIndex + 3] }
  const segLen = Math.hypot(segEnd.x - segStart.x, segEnd.y - segStart.y)
  const ux = segLen === 0 ? 1 : Math.abs(segEnd.x - segStart.x) / segLen
  const uy = segLen === 0 ? 0 : Math.abs(segEnd.y - segStart.y) / segLen
  const gapHalfLength = Math.min(gapHalfWidth * ux + gapHalfHeight * uy, Math.max(0, half - MIN_VISIBLE_STUB))

  const target1 = half - gapHalfLength
  const target2 = half + gapHalfLength

  let before: number[] | null = null
  let after: number[] | null = null

  if (target1 > 0.5) {
    const split1 = pointAtArcLength(points, target1)
    before = [...points.slice(0, split1.segIndex + 2), split1.point.x, split1.point.y]
  }
  if (target2 < total - 0.5) {
    const split2 = pointAtArcLength(points, target2)
    after = [split2.point.x, split2.point.y, ...points.slice(split2.segIndex + 2)]
  }

  return { before, after, bezier: false }
}
