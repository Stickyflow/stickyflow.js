import type { CategoryChartConfig } from './category';

export interface BarChartConfig extends CategoryChartConfig {
  barCornerRadius?: number;
  barBorderColor?: string;
  barBorderWidth?: number;
  /** Space between the groups of bars, in px. Default 8. */
  barGroupGap?: number;
  /** Space between the bars inside one group, in px. Default 2. */
  barGap?: number;
  stacked?: 'none' | 'true' | 'percent' | 'waterfall';
}
