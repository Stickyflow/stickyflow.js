import type { ChartZone } from '../annotations';

export interface TreemapChartConfig {
  zones?: ChartZone[];
  cellGap?: number;
  barCornerRadius?: number;
  headerColor?: string;
  tileGradient?: boolean;
  tileStrokeColor?: string;
  tileStrokeWidth?: number;
  tileLabelSize?: number;
  tileValueSize?: number;
  tileTextColor?: string;
  tileLabelPadding?: number;
  showTileValues?: boolean;
  headerHeight?: number;
}
