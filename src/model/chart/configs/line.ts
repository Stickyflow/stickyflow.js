import type { CategoryChartConfig } from './category';

export interface LineChartConfig extends CategoryChartConfig {
  areaOpacity?: number;
  lineTension?: number;
  lineWidth?: number;
  lineGlow?: number;
  pointSize?: number;
  pointFill?: string;
  pointStrokeWidth?: number;
  highlightPoints?: number[];
  highlightSize?: number;
  highlightColor?: string;
  highlightGuide?: boolean;
  highlightLabels?: boolean;
  highlightLabelColor?: string;
  highlightLabelFormat?: string;
}
