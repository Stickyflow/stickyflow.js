import type { ChartSeries, ChartZone } from '../../../../model/chart';

export interface TreemapLayout {
  leaves: ChartSeries[];
  bands: number[];
  zones: ChartZone[];
  fontSize: number;
  smallFontSize: number;
  legendPosition: 'bottom' | 'left' | 'right';
  legendHeight: number;
  gridWidth: number;
  gridHeight: number;
  cellGap: number;
  cellRadius: number;
  headerHeight: number;
  labelSize: number;
  valueSize: number;
  labelPadding: number;
}
