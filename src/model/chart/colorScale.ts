export interface ChartRamp {
  type: 'ramp';
  stops: Array<{ position: number; color: string }>;
}
