import type { ChartZone } from '../annotations';
import type { CategoryChartConfig } from './category';

export interface HeatmapChartConfig extends CategoryChartConfig {
  zones?: ChartZone[];
  cellGap?: number;
  showValues?: boolean;
  squareCells?: boolean;
  barCornerRadius?: number;
}
