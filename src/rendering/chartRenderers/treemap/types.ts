import type { ChartSeries, ChartZone } from '../../../model/charts';

export interface TreemapLayout {
  leaves: ChartSeries[];
  bands: number[];
  zones: ChartZone[];
  fontSize: number;
  smallFontSize: number;
  legendHeight: number;
  gridWidth: number;
  gridHeight: number;
}
