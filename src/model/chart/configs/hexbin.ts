import type { ChartRamp } from '../colorScale';

export interface HexbinChartConfig {
  hexRadius?: number;
  scale?: ChartRamp;
  hexGap?: number;
  hexStrokeWidth?: number;
  hexStrokeColor?: string;
  hexMinOpacity?: number;
}
