import type { SflCanvasObject } from '../../types';
import type { SflDimensionData } from './types';

export type SflDimensionObject = SflCanvasObject & {
  objectType: 'dimension';
  dimension: SflDimensionData;
};

export function isDimensionObject(canvasObject: SflCanvasObject): canvasObject is SflDimensionObject {
  return canvasObject.objectType === 'dimension' && canvasObject.dimension !== undefined;
}
