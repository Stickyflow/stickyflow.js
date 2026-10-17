import type { CategoryChartConfig } from './category';

export interface ScatterChartConfig extends CategoryChartConfig {
  pointSize?: number;
  pointOpacity?: number;
  pointStrokeWidth?: number;
  pointStrokeColor?: string;
}
