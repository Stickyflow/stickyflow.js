import type { ChartZone } from '../annotations';
import type { CategoryChartConfig } from './cartesian';

export interface HeatmapChartConfig extends CategoryChartConfig {
  zones?: ChartZone[];
  cellGap?: number;
  showValues?: boolean;
  squareCells?: boolean;
  barCornerRadius?: number;
}

export interface TreemapChartConfig {
  zones?: ChartZone[];
  cellGap?: number;
  barCornerRadius?: number;
  headerColor?: string;
  tileGradient?: boolean;
}
