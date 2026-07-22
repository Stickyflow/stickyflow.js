import type { Frame } from '../model/frames';
import type { Link, MarkerType, PathType } from '../model/links';
import type { Shape } from '../model/shapes';
import type { Swimlane } from '../model/swimlanes';
import type { Table } from '../model/tables';

export interface Point { x: number; y: number }
export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

export type ScenePaint =
  | { kind: 'none' }
  | { kind: 'solid'; color: string }
  | { kind: 'linear-gradient'; angle: number; stops: Array<{ offset: number; color: string }> }
  | { kind: 'mesh-gradient'; points: Array<{ x: number; y: number; color: string }> };

export interface SceneStyle {
  fill?: ScenePaint;
  stroke?: ScenePaint;
  strokeWidth?: number;
  dash?: number[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  opacity?: number;
  shadow?: { color: string; opacity: number; blur: number; dx: number; dy: number };
}

/** Semantic role of a node's owner in the interactive DOM contract (§9). */
export type SceneRole = 'entity' | 'link' | 'frame' | 'swimlane' | 'table';

export interface SceneBase {
  id: string; order: number; bounds: Bounds;
  // Interactive DOM contract (ADR-03). Optional so non-interactive renders and
  // older scenes stay valid; set by buildRenderScene for addressable owners.
  sfRole?: SceneRole;
  /** Stable owner id shared by every node of the same entity/link/etc. */
  sfId?: string;
  /** Owner kind (e.g. shapeType) surfaced as data-sf-kind. */
  sfKind?: string;
  /** Human label for the focusable owner node; drives tabindex + aria-label. */
  ariaLabel?: string;
}

export interface SceneRect extends SceneBase {
  type: 'rect'; x: number; y: number; width: number; height: number; rx?: number;
  rotation?: number; style: SceneStyle;
}

export interface SceneEllipse extends SceneBase {
  type: 'ellipse'; cx: number; cy: number; rx: number; ry: number;
  rotation?: number; style: SceneStyle;
}

export interface ScenePath extends SceneBase {
  type: 'path'; d: string; rotation?: number; rotationCenter?: Point; style: SceneStyle;
  markerStart?: MarkerType; markerEnd?: MarkerType;
}

export interface SceneText extends SceneBase {
  type: 'text'; x: number; y: number; width: number; height: number; lines: string[];
  fontFamily: string; fontSize: number; fontWeight: 'normal' | 'bold';
  color: string; align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom'; lineHeight: number;
  rotation?: number; rotationCenter?: Point;
}

export type RenderNode = SceneRect | SceneEllipse | ScenePath | SceneText;

export interface RenderDiagnostic {
  severity: 'warning' | 'error'; code: string; message: string; entityId?: string;
}

export interface RenderScene {
  nodes: RenderNode[];
  bounds: Bounds;
  diagnostics: RenderDiagnostic[];
}

/**
 * Versioned interactive DOM contract (ADR-03). The renderer stamps this onto the
 * root <svg data-sf-contract="…">; the viewer checks it on mount and refuses a
 * mismatch instead of binding silently to attributes it doesn't understand.
 * Bump only on a breaking change to data-sf-* names, roles or id scheme.
 */
export const DOM_CONTRACT_VERSION = 1;

export interface ResolvedExportLink {
  link: Link;
  from: Point;
  to: Point;
}

export interface RenderInput {
  shapes: Shape[];
  frames: Frame[];
  swimlanes: Swimlane[];
  tables?: Table[];
  links: ResolvedExportLink[];
}

export interface ResolvedLinkGeometry {
  id: string; pathType: PathType; points: number[]; label?: Point;
}
