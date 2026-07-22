
import type { GradientColor } from './colors'
import { hexToRgb, rgbToHex } from './colorConversion'
import type { ShadowStyle } from './shadows'

/** Stroke style options for links */
export type StrokeStyle = 'solid' | 'dashed' | 'dotted'

/** Path type options for links */
export type PathType = 'straight' | 'curved' | 'orthogonal'

/** Arrow direction options for links */
export type ArrowDirection = 'none' | 'forward' | 'backward' | 'bidirectional'

/** Marker types for link endpoints (Miro-style) */
export type MarkerType = 
  | 'none'           // No marker
  | 'arrow'          // Standard outline arrow
  | 'filled_arrow'   // Filled arrow
  | 'circle'         // Open circle (UML: aggregation)
  | 'filled_circle'  // Filled circle (endpoint)
  | 'diamond'        // Open diamond (UML: composition)
  | 'filled_diamond' // Filled diamond
  | 'bar'            // Perpendicular bar
  | 'triangle'       // Hollow UML generalization/realization triangle
  | 'one'            // ER exactly one: ||
  | 'zero_one'       // ER zero or one: O|
  | 'many'           // ER many: crow's foot
  | 'one_many'       // ER one or many: |<
  | 'zero_many'      // ER zero or many: O<

export type RelationPreset =
  | 'custom'
  | 'uml_association'
  | 'uml_directed_association'
  | 'uml_dependency'
  | 'uml_aggregation'
  | 'uml_composition'
  | 'uml_generalization'
  | 'uml_realization'
  | 'er_one_one'
  | 'er_zero_one'
  | 'er_one_many'
  | 'er_zero_many'

/** Style properties for links */
export interface LinkStyle {
  color?: string | GradientColor  // Solid color or gradient for the connection line
  strokeWidth?: number
  strokeStyle?: StrokeStyle
  pathType?: PathType
  arrowDirection?: ArrowDirection
  opacity?: number
  fontSize?: number  // Font size of the link's text label (default: 10)
  fontFamily?: string
  shadow?: ShadowStyle  // Configurable drop shadow (color, angle, distance, blur, opacity)
  relationPreset?: RelationPreset
  startLabel?: string   // UML multiplicity / role label at source endpoint
  endLabel?: string     // UML multiplicity / role label at target endpoint
}

/**
 * Resolve a LinkStyle.color value to a single representative hex color
 * (used where only a solid color is possible, e.g. SVG export, layer panel swatch).
 * For gradients, returns the first stop's color. Also tolerates legacy
 * `{ type: 'solid', color }` objects that may exist in older saved data.
 */
export function getLinkStrokeColor(colorValue: LinkStyle['color'] | { type: 'solid'; color: string } | null | undefined): string | undefined {
  if (!colorValue) return undefined
  if (typeof colorValue === 'string') return colorValue
  if (colorValue.type === 'gradient') return colorValue.stops?.[0]?.color
  if (colorValue.type === 'solid') return colorValue.color
  return undefined
}

/**
 * Resolve a LinkStyle.color value to the color at a specific end of the link.
 * For gradients, 'start' returns the first stop's color and 'end' the last
 * stop's color - matching the gradient axis rendered along the line
 * (see getLinkGradientStrokeProps in ConnectionLine.tsx). Solid colors
 * return the same value for both ends.
 */
export function getLinkEndpointColor(
  colorValue: LinkStyle['color'] | { type: 'solid'; color: string } | null | undefined,
  end: 'start' | 'end'
): string | undefined {
  if (colorValue && typeof colorValue === 'object' && colorValue.type === 'gradient' && colorValue.stops?.length) {
    const stops = colorValue.stops
    return end === 'start' ? stops[0].color : stops[stops.length - 1].color
  }
  return getLinkStrokeColor(colorValue)
}

/** Linearly mix two hex colors. t=0 -> colorA, t=1 -> colorB. */
function mixHexColors(colorA: string, colorB: string, t: number): string {
  const a = hexToRgb(colorA)
  const b = hexToRgb(colorB)
  return rgbToHex(
    Math.round(a.r + (b.r - a.r) * t),
    Math.round(a.g + (b.g - a.g) * t),
    Math.round(a.b + (b.b - a.b) * t)
  )
}

/** Resolve a gradient's color at a given stop position (0-100), interpolating between the surrounding stops. */
function getGradientColorAtPosition(stops: GradientColor['stops'], position: number): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (position <= first.position) return first.color
  if (position >= last.position) return last.color

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[i + 1]
    if (position >= a.position && position <= b.position) {
      const t = b.position === a.position ? 0 : (position - a.position) / (b.position - a.position)
      return mixHexColors(a.color, b.color, t)
    }
  }
  return last.color
}

/**
 * Resolve a LinkStyle.color value to the color at a specific world-space point along
 * the link's path. For gradients, projects the point onto the gradient axis (the
 * line's first-to-last point, matching getLinkGradientStrokeProps in
 * connectionLineGeometry.ts) and interpolates between the surrounding stops.
 * Solid colors return the same value everywhere.
 */
export function getLinkColorAtPoint(
  colorValue: LinkStyle['color'] | { type: 'solid'; color: string } | null | undefined,
  points: number[],
  point: { x: number; y: number }
): string | undefined {
  if (colorValue && typeof colorValue === 'object' && colorValue.type === 'gradient' && colorValue.stops?.length) {
    if (points.length < 4) return colorValue.stops[0]?.color

    const axisStart = { x: points[0], y: points[1] }
    const axisEnd = { x: points[points.length - 2], y: points[points.length - 1] }
    const dx = axisEnd.x - axisStart.x
    const dy = axisEnd.y - axisStart.y
    const lengthSq = dx * dx + dy * dy
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1,
      ((point.x - axisStart.x) * dx + (point.y - axisStart.y) * dy) / lengthSq
    ))

    return getGradientColorAtPosition(colorValue.stops, t * 100)
  }
  return getLinkStrokeColor(colorValue)
}

/** Link zwischen zwei Notes (oder später: anderen Entities) */
export interface Link {
  id:         string       // UUID
  name?:      string       // lesbarer, board-eindeutiger Slug (SFL-Identität)
  fromId:     string       // Quell‑Element
  toId:       string       // Ziel‑Element
  weight?:    number       // Connection weight
  showWeight?: boolean     // Show/hide weight badge
  text?:      string       // Text label on connection line
  showText?:  boolean      // Show/hide text label
  style?:     LinkStyle    // Visual styling
  // Feste Verbindungspunkte als Offsets (0-1 relativ zu Element-Grenzen) oder absolute Koordinaten
  fromPoint?: { side: 'top' | 'right' | 'bottom' | 'left', offset: number } | { x: number; y: number; isAbsolute: true }
  toPoint?:   { side: 'top' | 'right' | 'bottom' | 'left', offset: number } | { x: number; y: number; isAbsolute: true }
  
  // 🎯 NEW MIRO-STYLE: Per-segment offsets for multi-handle path adjustment
  // Array of perpendicular offsets, one per movable segment (middle segments only, not start/end)
  // For a typical 5-segment path, this would be [0, offset1, 0] where only middle segment moves
  segmentOffsets?: number[]

  // 🧭 Obstacle-avoiding route: explicit intermediate orthogonal corner points in
  // WORLD coordinates (excluding the from/to anchors, which stay derived from the
  // entities). Written by the deterministic avoidance pass (A* around shapes).
  // When present on an orthogonal link, the renderer draws [from, ...waypoints, to]
  // verbatim instead of the 2-bend template - so multi-bend detours are possible.
  // Reset (like segmentOffsets) when an endpoint is dragged.
  waypoints?: Array<{ x: number; y: number }>
  
  // 🎯 NEW: Marker types for start and end of link (Miro-style arrow heads, circles, etc.)
  startMarker?: MarkerType    // Marker at start of link (default: none)
  endMarker?: MarkerType      // Marker at end of link (default: arrow)
  start_marker?: MarkerType   // snake_case alias from backend
  end_marker?: MarkerType     // snake_case alias from backend
  
  // Layer Management - Support both snake_case and camelCase from backend
  layer_group: string;
  layerGroup?: string;   // camelCase alias from backend
  order_key: string;
  orderKey?: string;     // camelCase alias from backend
  is_visible: boolean;
  isVisible?: boolean;   // camelCase alias from backend
  is_locked: boolean;
  isLocked?: boolean;    // camelCase alias from backend
  
  // 🖼️ Frame Binding: Links can be assigned to frames (like Notes, Shapes, Texts)
  parent_frame_id?: string;  // UUID of parent frame
  parentFrameId?: string;    // camelCase alias from backend

  // 🏊 Swimlane Binding: schema-only in v1, no frontend wiring yet (mirrors parent_frame_id status quo)
  parent_swimlane_id?: string;
  lane_id?: string;
}
