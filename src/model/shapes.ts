
import type { ShadowStyle } from './shadows';
export type { ShadowStyle };

/** Gradient Color für Shape Fills/Strokes */
export interface GradientColorObject {
  type: 'gradient';
  angle: number; // 0-360 degrees
  stops: Array<{ position: number; color: string }>; // position in 0-100 range
}

/** Mesh Gradient (multi-point organic blob gradient) für Shape Fill */
export interface MeshGradientObject {
  type: 'mesh';
  points: Array<{ id: string; x: number; y: number; color: string }>;
}

/** Stroke-Linienstil einer Shape. 'double' hat kein `dash`-Muster (das kann keine
 * zwei parallelen Linien erzeugen) - wird stattdessen als zwei Ringe (außen an
 * der nominalen Grenze, innen um `strokeWidth` eingerückt) mit echter Lücke
 * gerendert, siehe `getDoubleStrokeGeometry` in `ui/renderers/types.ts`. */
export type ShapeStrokeStyle = 'solid' | 'dashed' | 'dotted' | 'double';

/**
 * MVP Shape Types (9 shapes):
 * 1. rounded_rectangle - Task, Step, Agent, Transform, Service Call
 * 2. rectangle - Entity, System, Role, Component, API, Policy
 * 3. diamond - Decision, Gateway, Router
 * 4. circle - Event, Trigger, Start/End
 * 5. container_rectangle - Pool, Lane, System Boundary, Domain
 * 6. cylinder - Database, Storage, Data Sink/Source
 * 7. document - Schema, Artifact, Data Object, Contract
 * 8. pill - Queue, Topic, Bus, Stream
 * 9. person - User, Role, Human-in-the-loop
 * 
 * Legacy shapes (kept for backward compatibility):
 * - triangle, hexagon, parallelogram, trapezoid
 */
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
  // Maps §3.3: base-layer image (floor plan scan, map, photo). Content lives
  // in Shape.imageUrl, not here - shapeType only selects the renderer.
  | 'image';

/** Color Stop für Gradients */
export interface ColorStop {
  position: number; // 0-1
  color: string;
}

/** Fill Styling für Shapes */
export interface FillStyle {
  type: 'none' | 'solid' | 'linear' | 'radial';
  color?: string; // für solid
  colors?: ColorStop[]; // für gradients
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  startRadius?: number; // für radial
  endRadius?: number; // für radial
  opacity?: number;
}

/** Stroke Styling für Shapes */
export interface StrokeStyle {
  type: 'none' | 'solid' | 'linear' | 'radial';
  color?: string; // für solid
  colors?: ColorStop[]; // für gradients
  width?: number;
  startPoint?: { x: number; y: number };
  endPoint?: { x: number; y: number };
  startRadius?: number; // für radial
  endRadius?: number; // für radial
  opacity?: number;
  dash?: number[];
}

/** Shape Styling kombiniert */
export interface ShapeStyle {
  fill?: FillStyle;
  stroke?: StrokeStyle;
  opacity?: number;
}

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

  // Maps §3.3: base-layer image - nur bei shapeType === 'image'.
  imageUrl?: string | null
  imageFit?: 'cover' | 'contain'

  createdAt: string
}

export interface SubShape {
  id: string
  text: string
}

export interface ShapeCreate {
  name?: string  // lesbarer, board-eindeutiger Slug (SFL-Identität)
  shapeType?: ShapeType
  parent_frame_id?: string | null
  parent_swimlane_id?: string | null
  lane_id?: string | null
  x: number
  y: number
  width: number
  height: number
  rotation?: number | null
  text?: string | null  // Text content centered in shape
  textColor?: string | null  // Text color for shape text
  
  // Text formatting
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
  textVerticalAlign?: 'top' | 'middle' | 'bottom'
  lineHeight?: number

  // Legacy Support (now supports gradients)
  strokeColor?: string | GradientColorObject | null
  strokeWidth?: number
  fillColor?: string | GradientColorObject | MeshGradientObject | null
  cornerRadius?: number | null
  dash?: number[]
  /** Default 'solid'. 'double' überschreibt `dash` fürs Rendering (siehe ShapeStrokeStyle). */
  strokeStyle?: ShapeStrokeStyle

  // Visual effects
  hasShadow?: boolean
  shadowStyle?: ShadowStyle

  // Erweiterte Styling-Optionen
  shapeStyle?: ShapeStyle;

  // Sub-shapes
  subShapes?: SubShape[] | null

  // Layer Management (optional — Backend setzt sinnvolle Defaults, wenn nicht
  // gesetzt; explizit gesetzt z.B. beim SFL-Import, um die Stapelreihenfolge
  // aus dem Dokument zu übernehmen statt neu ans Ende anzuhängen)
  layer_group?: string
  order_key?: string
  is_visible?: boolean
  is_locked?: boolean
}

export interface ShapeUpdate {
  name?: string  // lesbarer, board-eindeutiger Slug (SFL-Identität)
  x?: number
  y?: number
  width?: number
  height?: number
  shapeType?: ShapeType
  rotation?: number | null
  text?: string | null  // Text content centered in shape
  textColor?: string | null  // Text color for shape text
  
  // Text formatting
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
  textVerticalAlign?: 'top' | 'middle' | 'bottom'
  lineHeight?: number

  // Legacy Support (now supports gradients)
  strokeColor?: string | GradientColorObject | null
  strokeWidth?: number
  fillColor?: string | GradientColorObject | MeshGradientObject | null
  cornerRadius?: number | null
  dash?: number[]
  /** Default 'solid'. 'double' überschreibt `dash` fürs Rendering (siehe ShapeStrokeStyle). */
  strokeStyle?: ShapeStrokeStyle

  // Visual effects
  hasShadow?: boolean
  shadowStyle?: ShadowStyle

  // Erweiterte Styling-Optionen
  shapeStyle?: ShapeStyle;

  // Sub-shapes
  subShapes?: SubShape[] | null
}

// Common defaults for all shapes
const COMMON_DEFAULTS = {
  // Legacy Support
  strokeColor: '#cbd5e1', // Neutral gray (slate-300)
  strokeWidth: 2,
  fillColor: '#ffffff', // White
  dash: [],
  strokeStyle: 'solid' as const,
  // Text formatting
  fontSize: 14,
  fontWeight: 'normal' as const,
  textAlign: 'center' as const,
  textVerticalAlign: 'middle' as const,
  lineHeight: 1.3,
  // Visual effects
  hasShadow: false,
  // Neues Styling-System
  shapeStyle: {
    stroke: {
      type: 'solid' as const,
      color: '#cbd5e1', // Neutral gray
      width: 2,
      opacity: 1,
      dash: []
    },
    fill: {
      type: 'solid' as const,
      color: '#ffffff', // White
      opacity: 1
    },
    opacity: 1
  }
};

// Shape-spezifische Defaults
export const SHAPE_DEFAULTS = {
  rectangle: {
    ...COMMON_DEFAULTS
  },
  rounded_rectangle: {
    ...COMMON_DEFAULTS,
    cornerRadius: 8,
  },
  circle: COMMON_DEFAULTS,
  triangle: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  diamond: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  hexagon: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  oval: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  document: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  parallelogram: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  trapezoid: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  cylinder: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  container_rectangle: COMMON_DEFAULTS,
  pill: COMMON_DEFAULTS,
  person: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  // Maps §3.3: base-layer image. No stroke by default - an uploaded photo/
  // floor-plan scan doesn't want a border unless the author adds one.
  image: {
    ...COMMON_DEFAULTS,
    rotation: 0,
    imageFit: 'cover' as const,
  },
} as const;

/** Every valid `shape:` value, as a real runtime array — `ShapeType` itself
 *  is erased at compile time, so a host building something like a shape
 *  picker had no way to iterate it and previously had to hand-copy the list
 *  (see examples/sfl-chat before this export existed), which drifts the
 *  moment a shape is added or removed here. Derived from SHAPE_DEFAULTS'
 *  own keys rather than declared separately, so the two can't disagree. */
export const SHAPE_TYPES = Object.keys(SHAPE_DEFAULTS) as ShapeType[];
