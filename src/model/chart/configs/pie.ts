export interface PieChartConfig {
  innerRadius?: number;
  pieCornerRadius?: number;
  pieSliceGap?: number;
  // Where the first slice starts, in degrees clockwise from the top.
  pieStartAngle?: number;
  // The angle all slices share, in degrees; below 360 the chart is a fan or a gauge.
  pieSweep?: number;
  // Distance every slice is pushed out from the center.
  pieExplode?: number;
  // Blur radius of a glow in the color of each slice.
  pieGlow?: number;
  pieStroke?: string;
  pieStrokeWidth?: number;
  pieLabelPosition?: 'auto' | 'inside' | 'outside';
  pieLabelContent?: 'both' | 'percent' | 'name' | 'inline';
  pieLabelColor?: string;
  // Text in the middle; {total}, {percent} and {label} refer to the first slice and the sum.
  pieCenterText?: string;
  pieCenterSize?: number;
  pieCenterColor?: string;
}
