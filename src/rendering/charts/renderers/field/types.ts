import type { ChartSeries } from '../../../../model/charts';
import type { FieldSample } from '../../field/types';

export interface FieldData {
  scalarSamples: FieldSample[];
  vectorSeries: ChartSeries[];
}

export interface ScalarFieldGrid {
  values: Float32Array;
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
}
