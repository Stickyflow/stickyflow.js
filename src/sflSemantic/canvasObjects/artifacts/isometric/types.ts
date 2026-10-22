import type { SflCanvasObject } from '../../types';

export interface SflIsometricData {
  depth: number;
  icon?: string;
  footprint?: Array<[number, number]>;
  form: 'box' | 'sphere';
}

export type SflIsometricObject = SflCanvasObject & {
  objectType: 'isometric';
  isometric: SflIsometricData;
};

export function isIsometricObject(canvasObject: SflCanvasObject): canvasObject is SflIsometricObject {
  return canvasObject.objectType === 'isometric' && canvasObject.isometric !== undefined;
}
