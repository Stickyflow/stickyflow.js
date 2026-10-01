export interface ChartAxis {
  min: number;
  max: number;
  step: number;
  label?: string;
  unit?: string;
  thresholds?: number[];
}
