import type { ShadowStyle } from '../shadows'
export type { ShadowStyle }

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

