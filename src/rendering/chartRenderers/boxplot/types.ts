export interface BoxplotLayout {
  slotWidth: number;
  boxWidth: number;
  cornerRadius: number;
  showPoints: boolean;
  borderColor: string;
  borderWidth: number;
}

export interface BoxplotGeometry {
  centerX: number;
  minY: number;
  q1Y: number;
  medianY: number;
  q3Y: number;
  maxY: number;
}

export interface BoxplotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}
