export interface PieChartConfig {
  innerRadius?: number;
  pieCornerRadius?: number;
  pieSliceGap?: number;
  pieStartAngle?: number;
  pieSweep?: number;
  pieExplode?: number;
  pieGlow?: number;
  pieStroke?: string;
  pieStrokeWidth?: number;
  pieLabelPosition?: 'auto' | 'inside' | 'outside';
  pieLabelContent?: 'both' | 'percent' | 'name' | 'inline';
  pieLabelColor?: string;
  pieCenterText?: string;
  pieCenterSize?: number;
  pieCenterColor?: string;
}
