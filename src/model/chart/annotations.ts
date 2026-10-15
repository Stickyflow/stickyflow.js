export interface ChartZone {
  label: string;
  color?: string;
  offsetX?: number;
  offsetY?: number;
}

export interface ChartRule {
  id: string;
  at: number;
  text?: string;
  color?: string;
  strokeWidth?: number;
  dash?: number[];
}
