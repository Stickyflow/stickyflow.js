import type { ShadowStyle } from '../shadows'
import type { GradientColorObject, MeshGradientObject, ShapeStrokeStyle, ShapeStyle } from './paint'

export type ShapeType =
  | 'rounded_rectangle'
  | 'rectangle'
  | 'diamond'
  | 'circle'
  | 'oval'
  | 'container_rectangle'
  | 'cylinder'
  | 'document'
  | 'pill'
  | 'person'
  | 'triangle'
  | 'hexagon'
  | 'parallelogram'
  | 'trapezoid'
  // Freie, benannte Form aus dem SFL-Dokument (§5.5 Symbol). Die Geometrie
  // steht in Shape.symbol, nicht hier - `symbol` wählt nur den Renderer.
  | 'symbol'
  // Maps §3.3: base-layer image (floor plan scan, map, photo). Content lives
  // in Shape.imageUrl, not here - same "shapeType only selects the renderer"
  // convention as 'symbol' above.
  | 'image';

export interface Shape {
  id: string
  boardId: string
  name?: string  // lesbarer, board-eindeutiger Slug (SFL-Identität)
  shapeType: ShapeType
  x: number
  y: number
  width: number
  height: number
  rotation?: number | null
  text?: string | null  // Text content centered in shape
  textColor?: string | null  // Text color for shape text
  
  // Text formatting
  fontSize?: number  // Font size in points
  fontWeight?: 'normal' | 'bold'  // Font weight
  fontFamily?: string  // CSS font-family stack (curated selection), empty/undefined = default
  textAlign?: 'left' | 'center' | 'right'  // Horizontal text alignment
  textVerticalAlign?: 'top' | 'middle' | 'bottom'  // Vertical text alignment
  lineHeight?: number  // Line spacing as a multiple of fontSize (Konva convention), undefined = default

  // Legacy für Backward Compatibility (now supports gradients)
  strokeColor?: string | GradientColorObject | null
  strokeWidth?: number
  fillColor?: string | GradientColorObject | MeshGradientObject | null
  cornerRadius?: number | null
  dash?: number[]
  /** Default 'solid'. 'double' überschreibt `dash` fürs Rendering (siehe ShapeStrokeStyle). */
  strokeStyle?: ShapeStrokeStyle

  // Visual effects
  hasShadow?: boolean  // Drop shadow effect (legacy on/off toggle, kept in sync with shadowStyle.enabled)
  shadowStyle?: ShadowStyle  // Configurable drop shadow (color, angle, distance, blur, opacity)

  // Erweiterte Styling-Optionen
  shapeStyle?: ShapeStyle;

  // Layer Management
  layer_group: string;
  order_key: string;
  is_visible: boolean;
  is_locked: boolean;

  // Frame Binding
  parent_frame_id?: string | null;

  // Swimlane Binding
  parent_swimlane_id?: string | null;
  lane_id?: string | null;

  // Sub-shapes - nested content rows shown inside this shape (e.g. collapsing a whole
  // phase's steps into one shape). Not independent canvas entities and never have their
  // own links - links always attach to this shape's own boundary either way.
  subShapes?: SubShape[] | null

  // Freie benannte Form - nur bei shapeType === 'symbol', siehe SymbolDef
  symbol?: SymbolDef | null

  // Maps §3.3: base-layer image - nur bei shapeType === 'image'.
  imageUrl?: string | null
  imageFit?: 'cover' | 'contain'

  createdAt: string
}

export interface SubShape {
  id: string
  text: string
}

/**
 * Freie, benannte Form (SFL 1.4 §5.5 Symbol), gültig nur bei
 * shapeType === 'symbol'. `points` sind auf 0..1 normalisiert und relativ zur
 * Bounding-Box der Instanz - dieselbe Definition kann also in jeder Größe
 * verwendet werden (anders als FreeformPath, dessen Punkte absolut sind).
 * Implizit geschlossen; `tension` glättet optional zu einer Kurve.
 *
 * Wie Style/Layout KEINE eigene persistierte Entity: der `name` trägt die
 * Wiederverwendung; mehrere Entities können per `shape: <Name>` auf dieselbe
 * Symbol-Definition zeigen.
 */
export interface SymbolDef {
  name: string
  points: Array<[number, number]>
  tension?: number
  // Benannte Anschlüsse (§3.5 Schematics): normalisiert (0..1) wie `points`,
  // relativ zur Bounding-Box der Instanz. Als Link-Endpunkt referenzierbar
  // über `entity.portName` statt `side (fraction)`.
  ports?: Array<{ name: string; at: [number, number] }>
}

