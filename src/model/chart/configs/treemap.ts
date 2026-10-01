import type { ChartZone } from '../annotations';

export interface TreemapChartConfig {
  zones?: ChartZone[];
  cellGap?: number;
  barCornerRadius?: number;
  headerColor?: string;
  tileGradient?: boolean;
}
