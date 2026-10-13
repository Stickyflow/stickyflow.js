import type { CategoryChartConfig } from './category';

export interface BarChartConfig extends CategoryChartConfig {
  barCornerRadius?: number;
  barBorderColor?: string;
  barBorderWidth?: number;
  /** Space between the groups of bars, in px. Default 8. */
  barGroupGap?: number;
  /** Glow radius in px, drawn in each bar's own color over the neighbouring bars. Default 0 (off). */
  barGlow?: number;
  /** Space between the bars inside one group, in px. Default 2. */
  barGap?: number;
  stacked?: 'none' | 'true' | 'percent' | 'waterfall';
}
