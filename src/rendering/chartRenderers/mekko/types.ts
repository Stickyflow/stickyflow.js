export interface MekkoGrid {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MekkoLayout {
  columns: string[];
  fontSize: number;
  smallFontSize: number;
  labelGutterWidth: number;
  grid: MekkoGrid;
  columnTotals: number[];
  columnWidths: number[];
  columnX: number[];
  columnHeights: number[];
  columnY: number[];
}
