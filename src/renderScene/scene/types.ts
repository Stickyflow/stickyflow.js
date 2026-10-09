import type { Diagnostic } from '../../model/diagnostic';
import type { Bounds, Point, Side } from '../../model/geometry/types';
import type { IsometricFace } from '../../model/isometricObject';
import type { MarkerType, PathType } from '../../model/link';

export type RenderDiagnostic = Diagnostic;
export type { Bounds, Point } from '../../model/geometry/types';

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
  pointerEvents?: 'none';
  shadow?: { color: string; opacity: number; blur: number; dx: number; dy: number };
  innerShadow?: { color: string; opacity: number; blur: number; dx: number; dy: number };
  blur?: number;
  clip?:
    | { type: 'rect'; x: number; y: number; width: number; height: number; rx: number }
    | { type: 'path'; d: string };
}

export type SceneRole = 'shape' | 'link' | 'frame' | 'swimlane' | 'path' | 'chart' | 'isometric';

export interface SceneIdentity {
  role: SceneRole;
  id: string;
  kind?: string;
  primary?: boolean;
  label?: string;
  parentFrameId?: string;
}

export type SceneDetail =
  | {
      of: 'link';
      fromId?: string;
      toId?: string;
      route?: PathType;
      fromSide?: Side;
      toSide?: Side;
      fromFace?: IsometricFace;
      toFace?: IsometricFace;
      labelGap?: boolean;
    }
  | {
      of: 'chartValue';
      series: string;
      valueIndex: number;
      mark?: 'bar' | 'pie-slice' | 'radar-vertex' | 'radial-bar-ring' | 'polar-area-wedge';
      radius?: number;
      colorProp?: string;
      hasColorOverride?: boolean;
      pieStart?: number;
      pieEnd?: number;
      pieValue?: number;
    }
  | { of: 'chartScale'; valueScale: string }
  | { of: 'pieGeometry'; pieGeometry: string }
  | { of: 'radarGeometry'; radarGeometry: string }
  | {
      of: 'chartSeries';
      series: string;
      lineTension?: number;
      mark?: string;
      pulled?: boolean;
      midAngle?: number;
      wedgeRadius?: number;
    }
  | { of: 'frameBoundary'; cornerRadius: number; squareCorner: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft' }
  | {
      of: 'symbolGeometry';
      points: Array<[number, number]>;
      tension: number;
      declaredBounds: { x: number; y: number; width: number; height: number };
    }
  | { of: 'declaredBounds'; bounds: { x: number; y: number; width: number; height: number } }
  | { of: 'pathGeometry'; points: Array<[number, number]>; tension: number; closed: boolean }
  | {
      of: 'isometricGeometry';
      width: number;
      height: number;
      depth: number;
      cornerRadius: number;
      bounds: { x: number; y: number; width: number; height: number };
      labelOffsetX: number;
      labelOffsetY: number;
    };

export interface SceneBase {
  id: string;
  order: number;
  bounds: Bounds;
  identity?: SceneIdentity;
  detail?: SceneDetail;
  prop?: string;
  propKind?: 'value' | 'color';
  propSolidOnly?: boolean;
  zoneGradient?: { axis: 'x' | 'y'; min: number; max: number };
  // Generic drag-target marker, read by interaction code that needs to tell
  // a node apart from its owner's default move/resize geometry (e.g. a
  // freely-draggable label) without a dedicated SceneDetail variant.
  mark?: string;
}

export interface SceneRect extends SceneBase {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  rotation?: number;
  style: SceneStyle;
}

export interface SceneEllipse extends SceneBase {
  type: 'ellipse';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation?: number;
  style: SceneStyle;
}

export interface ScenePath extends SceneBase {
  type: 'path';
  d: string;
  rotation?: number;
  rotationCenter?: Point;
  style: SceneStyle;
  markerStart?: MarkerType;
  markerEnd?: MarkerType;
}

export interface SceneText extends SceneBase {
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  lineHeight: number;
  rotation?: number;
  rotationCenter?: Point;
  richLines?: Array<Array<{ text: string; bold: boolean }>>;
}

export type RenderNode = SceneRect | SceneEllipse | ScenePath | SceneText;

export interface RenderScene {
  nodes: RenderNode[];
  bounds: Bounds;
  diagnostics: RenderDiagnostic[];
}
