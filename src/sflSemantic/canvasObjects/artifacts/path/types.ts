import type { SflCanvasObject } from '../../types';

export interface SflPathData {
  points: Array<{ x: number; y: number; tension?: number }>;
  tension?: number;
  startMarker?: string;
  endMarker?: string;
  closed?: boolean;
  value?: number;
}

export type SflPathObject = SflCanvasObject & {
  objectType: 'path';
  path: SflPathData;
};

export function isPathObject(canvasObject: SflCanvasObject): canvasObject is SflPathObject {
  return canvasObject.objectType === 'path' && canvasObject.path !== undefined;
}
