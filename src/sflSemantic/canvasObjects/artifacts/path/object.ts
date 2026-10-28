import type { SflCanvasObject } from '../../types';
import type { SflPathData } from './types';

export type SflPathObject = SflCanvasObject & {
  objectType: 'path';
  path: SflPathData;
};

export function isPathObject(canvasObject: SflCanvasObject): canvasObject is SflPathObject {
  return canvasObject.objectType === 'path' && canvasObject.path !== undefined;
}
