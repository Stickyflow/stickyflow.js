import type { ChartRamp } from '../colorScale';

export interface FieldChartConfig {
  scale?: ChartRamp;
  interpolate?: 'idw';
  idwPower?: number;
  isolines?: number[];
}

export interface HexbinChartConfig {
  hexRadius?: number;
}
