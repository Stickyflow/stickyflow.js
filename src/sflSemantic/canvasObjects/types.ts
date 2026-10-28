import type { SflChartData } from './artifacts/chart/types';
import type { SflDimensionData } from './artifacts/dimension/types';
import type { SflIsometricData } from './artifacts/isometric/types';
import type { SflPathData } from './artifacts/path/types';
import type { SflSwimlaneData } from './artifacts/swimlane/types';

export type SflCanvasObjectType =
  | 'shape'
  | 'frame'
  | 'swimlane'
  | 'path'
  | 'chart'
  | 'component'
  | 'isometric'
  | 'dimension';

export interface SflSymbolDefinition {
  name: string;
  points: Array<[number, number]>;
  pointTensions?: Array<number | undefined>;
  tension?: number;
  ports?: Array<{ name: string; at: [number, number] }>;
}

export interface SflCanvasObjectBase {
  id: string;
  kind: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  order?: number;
  sourceIndex?: number;
  parentFrameId?: string;
  props: Record<string, string>;
}

export interface SflCanvasObject extends SflCanvasObjectBase {
  objectType: SflCanvasObjectType;
  shapeType?: string;
  symbol?: SflSymbolDefinition;
  swimlane?: SflSwimlaneData;
  path?: SflPathData;
  chart?: SflChartData;
  component?: SflComponentData;
  isometric?: SflIsometricData;
  dimension?: SflDimensionData;
}

export interface SflComponentData {
  type: string;
  value: string;
  digits?: number;
  duration?: number;
  min?: number;
  max?: number;
  label?: string;
}

export type SflShapeObject = SflCanvasObject & { objectType: 'shape' };
export type SflFrameObject = SflCanvasObject & { objectType: 'frame' };
export type SflComponentObject = SflCanvasObject & { objectType: 'component'; component: SflComponentData };
