import type { CategoryChartConfig } from './category';

export interface BarChartConfig extends CategoryChartConfig {
  barCornerRadius?: number;
  barBorderColor?: string;
  barBorderWidth?: number;
  /** Space between the groups of bars, in px. Default 8. */
  barGroupGap?: number;
  /** Glow radius in px, drawn in each bar's own color over the neighbouring bars. Default 0 (off). */
  barGlow?: number;
  /** Full-height track behind every bar. */
  barTrack?: boolean;
  barTrackColor?: string;
  /** Diagonal hatching on the track. */
  barTrackHatch?: boolean;
  barTrackHatchColor?: string;
  /** Value labels on the bars. Default off. */
  showBarLabels?: boolean;
  /** 'axis' puts the value under the category label. */
  barLabelPosition?: 'outside' | 'inside' | 'center' | 'axis';
  barLabelFontSize?: number;
  barLabelFontFamily?: string;
  barLabelFontWeight?: 'normal' | 'bold';
  barLabelColor?: string;
  /** Draw a pill behind each label. */
  barLabelPill?: boolean;
  barLabelPillColor?: string;
  barLabelBorderColor?: string;
  barLabelBorderWidth?: number;
  /** Text template, {value} is replaced by the bar value. */
  barLabelFormat?: string;
  /** Space between the bars inside one group, in px. Default 2. */
  barGap?: number;
  stacked?: 'none' | 'true' | 'percent' | 'waterfall';
}
