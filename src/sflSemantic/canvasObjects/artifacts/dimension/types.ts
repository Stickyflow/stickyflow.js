import type { SflCanvasObject } from '../../types';

export interface SflDimensionData {
  start: { x: number; y: number };
  end: { x: number; y: number };
  offset: number;
  unit?: string;
}

export type SflDimensionObject = SflCanvasObject & {
  objectType: 'dimension';
  dimension: SflDimensionData;
};

export function isDimensionObject(canvasObject: SflCanvasObject): canvasObject is SflDimensionObject {
  return canvasObject.objectType === 'dimension' && canvasObject.dimension !== undefined;
}
