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
      const radius = Math.min(width, height) / 2, cx = x + width / 2, cy = y + height / 2
      const points: number[] = []
      for (let i = 0; i < 6; i++) points.push(cx + radius * Math.cos(i * Math.PI / 3), cy + radius * Math.sin(i * Math.PI / 3))
      return p(...points)
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
