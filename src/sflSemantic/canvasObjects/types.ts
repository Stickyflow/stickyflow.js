import type { SflChartData } from './artifacts/chart/types';
import type { SflIsometricData } from './artifacts/isometric/types';
import type { SflPathData } from './artifacts/path/types';
import type { SflSwimlaneData } from './artifacts/swimlane/types';

export type SflCanvasObjectType = 'shape' | 'frame' | 'swimlane' | 'path' | 'chart' | 'isometric';

export interface SflSymbolDefinition {
  name: string;
  points: Array<[number, number]>;
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
  isometric?: SflIsometricData;
}

export type SflShapeObject = SflCanvasObject & { objectType: 'shape' };
export type SflFrameObject = SflCanvasObject & { objectType: 'frame' };

export type { SflChartObject } from './artifacts/chart/types';
export { isChartObject } from './artifacts/chart/types';
export type { SflIsometricObject } from './artifacts/isometric/types';
export { isIsometricObject } from './artifacts/isometric/types';
export type { SflPathObject } from './artifacts/path/types';
export { isPathObject } from './artifacts/path/types';
export type { SflSwimlaneObject } from './artifacts/swimlane/types';
export { isSwimlaneObject } from './artifacts/swimlane/types';
