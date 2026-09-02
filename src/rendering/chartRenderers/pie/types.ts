export interface PiePoint {
  x: number;
  y: number;
}

export interface PieGeometry {
  centerX: number;
  centerY: number;
  outerRadius: number;
  innerRadius: number;
  total: number;
}

export interface PieSliceAngles {
  start: number;
  end: number;
}
