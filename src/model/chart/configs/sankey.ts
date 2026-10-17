import type { ChartZone } from '../annotations';

export interface SankeyChartConfig {
  zones?: ChartZone[];
  barCornerRadius?: number;
  labelPosition?: 'outside' | 'inside';
  labelOrientation?: 'horizontal' | 'vertical';
  labelColor?: string;
  linkGradient?: boolean;
  sankeyNodeWidth?: number;
  sankeyNodeGap?: number;
  sankeyLinkOpacity?: number;
  sankeyLinkCurve?: number;
  sankeyLabelSize?: number;
}
