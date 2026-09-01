export interface MatrixGeometry {
  xBands: number[];
  yBands: number[];
  xBandCount: number;
  yBandCount: number;
  xPixel: (value: number) => number;
  yPixel: (value: number) => number;
}

export interface MatrixZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
