import type { CategoryChartConfig } from './category';

export interface MekkoChartConfig extends CategoryChartConfig {
  barCornerRadius?: number;
  mekkoVaryHeight?: boolean;
  tileGradient?: boolean;
  showColumnBackdrop?: boolean;
}
