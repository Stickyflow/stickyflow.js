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

// Where the names of the rows and the columns and the color bar sit around the grid.
export interface HeatmapSides {
  rows: 'left' | 'right';
  columns: 'top' | 'bottom';
  legend: 'top' | 'bottom' | 'left' | 'right';
}

export interface HeatmapReservedSpace {
  // The width of the names of the rows, and the height of the names of the columns.
  rowHeaders: number;
  columnHeaders: number;
  // How thick the color bar and its numbers are on the side that it sits at, with the distance to the grid.
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
  // The space between the grid, or the names beside it, and the color bar.
  legendGap: number;
  sides: HeatmapSides;
  reservedSpace: HeatmapReservedSpace;
  grid: HeatmapGrid;
}
