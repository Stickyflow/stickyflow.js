import type { CategoryChartConfig } from './category';

export interface MekkoChartConfig extends CategoryChartConfig {
  barCornerRadius?: number;
  mekkoVaryHeight?: boolean;
  tileGradient?: boolean;
  showColumnBackdrop?: boolean;
  mekkoColumnGap?: number;
  mekkoSegmentGap?: number;
  mekkoRoundAll?: boolean;
  mekkoSegmentStrokeColor?: string;
  mekkoSegmentStrokeWidth?: number;
  mekkoLabelSize?: number;
  mekkoValueSize?: number;
  mekkoTextColor?: string;
  showMekkoTotals?: boolean;
  mekkoValueFormat?: 'value' | 'percent';
}
