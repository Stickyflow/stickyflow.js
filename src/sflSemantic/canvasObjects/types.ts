import type { SflChartData } from './artifacts/chart/types';
import type { SflIsometricData } from './artifacts/isometric/types';
import type { SflPathData } from './artifacts/path/types';
import type { SflSwimlaneData } from './artifacts/swimlane/types';
import type { SflTableData } from './artifacts/table/types';

export type SflCanvasObjectType =
  | 'shape'
  | 'frame'
  | 'swimlane'
  | 'table'
  | 'path'
  | 'chart'
  | 'isometric';

export interface SflSymbolDefinition {
  name: string;
  points: Array<[number, number]>;
  tension?: number;
  ports?: Array<{ name: string; at: [number, number] }>;
}

export interface SflCanvasObject {
  id: string;
  objectType: SflCanvasObjectType;
  kind: string;
  text?: string;
  shapeType?: string;
  symbol?: SflSymbolDefinition;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  order?: number;
  parentFrameId?: string;
  props: Record<string, string>;
  table?: SflTableData;
  swimlane?: SflSwimlaneData;
  path?: SflPathData;
  chart?: SflChartData;
  isometric?: SflIsometricData;
}

export { isChartObject } from './artifacts/chart/types';
export { isIsometricObject } from './artifacts/isometric/types';
export { isPathObject } from './artifacts/path/types';
export { isSwimlaneObject } from './artifacts/swimlane/types';
export { isTableObject } from './artifacts/table/types';
export type { SflChartObject } from './artifacts/chart/types';
export type { SflIsometricObject } from './artifacts/isometric/types';
export type { SflPathObject } from './artifacts/path/types';
export type { SflSwimlaneObject } from './artifacts/swimlane/types';
export type { SflTableObject } from './artifacts/table/types';
