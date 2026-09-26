import type { RenderDiagnostic } from '../../model/diagnostics';
import type { Side } from '../../model/geometry/router';
import type { Bounds, Point } from '../../model/geometry/types';
import type { MarkerType, PathType } from '../../model/links';

export type { RenderDiagnostic } from '../../model/diagnostics';
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
  shadow?: { color: string; opacity: number; blur: number; dx: number; dy: number };
  clip?: { x: number; y: number; width: number; height: number; rx: number };
}

export type SceneRole = 'entity' | 'link' | 'frame' | 'swimlane' | 'table' | 'path' | 'chart';

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
      labelGap?: boolean;
    }
  | {
      of: 'chartValue';
      series: string;
      valueIndex: number;
      mark?: 'bar' | 'pie-slice' | 'radar-vertex' | 'radial-bar-ring';
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
    }
  | { of: 'frameBoundary'; cornerRadius: number; squareCorner: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft' }
  | {
      of: 'symbolGeometry';
      points: Array<[number, number]>;
      tension: number;
      declaredBounds: { x: number; y: number; width: number; height: number };
    }
  | { of: 'declaredBounds'; bounds: { x: number; y: number; width: number; height: number } }
  | { of: 'tableColumnDivider'; columnId: string; startWidth: number; widthScale: number }
  | { of: 'pathGeometry'; points: Array<[number, number]>; tension: number; closed: boolean };

export interface SceneBase {
  id: string;
  order: number;
  bounds: Bounds;
  identity?: SceneIdentity;
  detail?: SceneDetail;
  prop?: string;
  propKind?: 'value' | 'color';
  propSolidOnly?: boolean;
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
