import type { ShapeType } from '../shapes'

// Pure per-shapeType path geometry, parameterized purely by (type, x, y,
// width, height) — shared by the static renderer (buildRenderScene.ts) and
// a live resize preview (stickyflow/interaction's resizeDrag.ts), so a
// path-based shape (diamond, hexagon, …) draws identically whether it's
// "being resized" or "just rendered".

const polygonPath = (points: number[]): string =>
  points.length < 4 ? '' : `M ${points[0]} ${points[1]} ${points.slice(2).reduce((s, n, i) => s + (i % 2 ? ` ${n}` : ` L ${n}`), '')} Z`

/** Path `d` for shape types that render as a single custom outline, or null
 *  for types the caller must handle itself (rect/ellipse/pill/… — plain SVG
 *  primitives — and composites like cylinder/person, which are more than one
 *  node). */
export function localShapePath(type: ShapeType, x: number, y: number, width: number, height: number): string | null {
  const p = (...coords: number[]) => polygonPath(coords)
  switch (type) {
    case 'diamond': return p(x + width / 2, y, x + width, y + height / 2, x + width / 2, y + height, x, y + height / 2)
    case 'triangle': return p(x + width / 2, y, x, y + height, x + width, y + height)
    case 'parallelogram': return p(x + width * .15, y, x + width, y, x + width * .85, y + height, x, y + height)
    case 'trapezoid': return p(x + width * .2, y, x + width * .8, y, x + width, y + height, x, y + height)
    case 'hexagon': {
      // Flat-topped hexagon spanning the full bounding box (not a regular
      // hexagon inscribed by min(width, height)) - connection points are
      // computed purely from the bounding box edges (see sflToRenderInput's
      // pointFor / router.ts's portToPoint), so a shape that doesn't reach
      // those edges leaves links floating short of the visible outline. The
      // left/right tips and the full top/bottom edges sit exactly on the
      // box, which keeps the default (offset 0.5) connection on every side
      // flush against the shape.
      const cut = Math.min(width, height) / 4
      return p(
        x + cut, y,
        x + width - cut, y,
        x + width, y + height / 2,
        x + width - cut, y + height,
        x + cut, y + height,
        x, y + height / 2
      )
    }
    case 'document': {
      const wave = height * .15
      return `M ${x} ${y} H ${x + width} V ${y + height - wave} ` +
        `Q ${x + width * .875} ${y + height + wave * .15} ${x + width * .75} ${y + height - wave} ` +
        `Q ${x + width * .625} ${y + height + wave * .15} ${x + width * .5} ${y + height - wave} ` +
        `Q ${x + width * .375} ${y + height + wave * .15} ${x + width * .25} ${y + height - wave} ` +
        `Q ${x + width * .125} ${y + height + wave * .15} ${x} ${y + height - wave} Z`
    }
    default: return null
  }
}
