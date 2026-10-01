import type { ChartZone } from '../annotations';
import type { CategoryChartConfig } from './cartesian';

export interface MekkoChartConfig extends CategoryChartConfig {
  barCornerRadius?: number;
  mekkoVaryHeight?: boolean;
  tileGradient?: boolean;
  showColumnBackdrop?: boolean;
}

export interface SankeyChartConfig {
  zones?: ChartZone[];
  barCornerRadius?: number;
  labelPosition?: 'outside' | 'inside';
  labelOrientation?: 'horizontal' | 'vertical';
  labelColor?: string;
  linkGradient?: boolean;
}

export interface CustomChartConfig extends CategoryChartConfig {
  zones?: ChartZone[];
  orientation?: 'horizontal' | 'vertical';
  connectPoints?: boolean;
  reverseComparison?: boolean;
}
