import type { Frame } from '../entities/frames/model';
import type { Link, MarkerType, PathType } from '../entities/links/model';
import type { Shape } from '../entities/shapes/model';
import type { Swimlane } from '../entities/swimlanes/model';
import type { Table } from '../entities/tables/model';

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

export interface SceneBase { id: string; order: number; bounds: Bounds }

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
