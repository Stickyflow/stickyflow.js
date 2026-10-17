import type { ChartZone } from '../annotations';
import type { CategoryChartConfig } from './category';

export interface HeatmapChartConfig extends CategoryChartConfig {
  zones?: ChartZone[];
  cellGap?: number;
  showValues?: boolean;
  squareCells?: boolean;
  barCornerRadius?: number;
  cellShape?: 'square' | 'circle';
  cellStrokeColor?: string;
  cellStrokeWidth?: number;
  cellValueSize?: number;
  cellValueColor?: string;
}
