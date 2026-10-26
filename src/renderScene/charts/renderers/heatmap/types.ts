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
  // The size of the names along the grid, which the axis settings give.
  headerFontSize: number;
  // The space between the grid and the color bar.
  legendGap: number;
  reservedSpace: HeatmapReservedSpace;
  grid: HeatmapGrid;
}
