export interface ChartZone {
  label: string;
  color?: string;
}

export interface ChartRule {
  id: string;
  at: number;
  text?: string;
  color?: string;
  strokeWidth?: number;
  dash?: number[];
}
