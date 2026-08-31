import type { PathType } from '../../links'

type Point = { x: number; y: number }

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

const bezierArcLength = (p0: Point, p1: Point, p2: Point, p3: Point, samples = 40): number => {
  let total = 0
  let prev = p0
  for (let i = 1; i <= samples; i++) {
    const pt = cubicBezierPoint(p0, p1, p2, p3, i / samples)
    total += Math.hypot(pt.x - prev.x, pt.y - prev.y)
    prev = pt
  }
  return total
}

export interface LabelGapDash {
  /** Stroke length to draw before the gap starts. */
  dashBefore: number
  /** Length of the gap itself — no stroke drawn here. */
  gapLength: number
}

/**
 * `splitPathAroundLabel` above physically cuts a link's path into a "before"
 * and "after" piece so a Konva `Line` (or, for the static SVG renderer, an SVG
 * `<path>`) can be drawn without a stroke behind the label. A single `<path>`
 * element has no equivalent of "draw two separate lines" — but it does support
 * `stroke-dasharray`, and drawing "some length, then a gap, then the rest" is
 * exactly what a dasharray already does. This measures the same split
 * `splitPathAroundLabel` computed and returns it as the two numbers a
 * dasharray needs, so the renderer can keep everything on the ONE path element
 * that owns the link's clickable hit area, its end markers, and (critically)
 * the full end-to-end length other code reads via getTotalLength()/
 * getPointAtLength() — endpoint dots (selectionOverlay.ts) and drag-to-
 * reconnect (linkEndpointDrag.ts) both assume that length spans the whole
 * link, which splitting into two real elements would break.
 *
 * Returns null under the same conditions splitPathAroundLabel does (a
 * degenerate path) or when the gap ends up covering the whole path (this can
 * only happen if the path is shorter than MIN_VISIBLE_STUB*2 — right at that
 * floor, a gap does not necessarily leave any measurable stub outside
 * floating-point noise). Either way, the caller should fall back to an
 * uninterrupted line.
 */
export function labelGapDash(points: number[], pathType: PathType, gapWidth: number, gapHeight: number): LabelGapDash | null {
  const split = splitPathAroundLabel(points, pathType, gapWidth, gapHeight)
  if (!split || (!split.before && !split.after)) return null

  const pieceLength = (piece: number[]): number => split.bezier
    ? bezierArcLength({ x: piece[0], y: piece[1] }, { x: piece[2], y: piece[3] }, { x: piece[4], y: piece[5] }, { x: piece[6], y: piece[7] })
    : polylineLength(piece)

  const totalLength = split.bezier
    ? bezierArcLength({ x: points[0], y: points[1] }, { x: points[2], y: points[3] }, { x: points[4], y: points[5] }, { x: points[6], y: points[7] })
    : polylineLength(points)

  const dashBefore = split.before ? pieceLength(split.before) : 0
  const afterLength = split.after ? pieceLength(split.after) : 0
  const gapLength = Math.max(0, totalLength - dashBefore - afterLength)
  if (gapLength <= 0) return null
  return { dashBefore, gapLength }
}

