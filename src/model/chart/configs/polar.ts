import type { CategoryChartConfig } from './cartesian';

export interface PieChartConfig {
  innerRadius?: number;
  pieCornerRadius?: number;
  pieSliceGap?: number;
}

export interface RadialBarChartConfig {
  ringThickness?: number;
  ringGap?: number;
}

export interface RadarChartConfig extends CategoryChartConfig {
  areaOpacity?: number;
}
