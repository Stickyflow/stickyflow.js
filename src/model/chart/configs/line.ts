import type { CategoryChartConfig } from './category';

export interface LineChartConfig extends CategoryChartConfig {
  areaOpacity?: number;
  lineTension?: number;
}
