import type { CategoryChartConfig } from './category';

export interface LineChartConfig extends CategoryChartConfig {
  areaOpacity?: number;
  lineTension?: number;
  // Stroke width of the lines, 2 when unset.
  lineWidth?: number;
  // Blur radius of a glow in the color of each line.
  lineGlow?: number;
  // Radius of the point marks, 3 when unset; 0 hides them.
  pointSize?: number;
  pointFill?: string;
  pointStrokeWidth?: number;
  // Positions of values to emphasise, negative ones count from the end.
  highlightPoints?: number[];
  highlightSize?: number;
  highlightColor?: string;
  highlightGuide?: boolean;
  highlightLabels?: boolean;
  highlightLabelColor?: string;
  // {category} and {value} are replaced.
  highlightLabelFormat?: string;
}
