import type { SflCanvasObject } from '../../types';
import type { SflIsometricData } from './types';

export type SflIsometricObject = SflCanvasObject & {
  objectType: 'isometric';
  isometric: SflIsometricData;
};

export function isIsometricObject(canvasObject: SflCanvasObject): canvasObject is SflIsometricObject {
  return canvasObject.objectType === 'isometric' && canvasObject.isometric !== undefined;
}
