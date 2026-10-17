export interface MekkoGrid {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MekkoColumn {
  label: string;
  total: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MekkoLayout {
  columns: MekkoColumn[];
  fontSize: number;
  smallFontSize: number;
  labelGutterWidth: number;
  columnGap: number;
  labelSize: number;
  valueSize: number;
  grid: MekkoGrid;
}
