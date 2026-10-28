import type { SflCanvasObject } from '../../types';
import type { SflChartData } from './types';

export type SflChartObject = SflCanvasObject & {
  objectType: 'chart';
  chart: SflChartData;
};

export function isChartObject(canvasObject: SflCanvasObject): canvasObject is SflChartObject {
  return canvasObject.objectType === 'chart' && canvasObject.chart !== undefined;
}
