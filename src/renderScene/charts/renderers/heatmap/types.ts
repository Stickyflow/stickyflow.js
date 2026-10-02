import type { ChartSeries, ChartZone } from '../../../../model/chart';

export interface HeatmapGrid {
  x: number;
  y: number;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  cellGap: number;
  cellRadius: number;
}

export interface HeatmapReservedSpace {
  rowHeaders: number;
  columnHeaders: number;
  legend: number;
}

export interface HeatmapLayout {
  rows: ChartSeries[];
  columns: string[];
  bands: number[];
  zones: ChartZone[];
  fontSize: number;
  reservedSpace: HeatmapReservedSpace;
  grid: HeatmapGrid;
}
