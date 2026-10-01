export interface CategoryChartConfig {
  categories?: string[];
}

export interface BarChartConfig {
  barCornerRadius?: number;
  barBorderColor?: string;
  barBorderWidth?: number;
  stacked?: 'none' | 'true' | 'percent' | 'waterfall';
}

export interface LineChartConfig extends CategoryChartConfig {
  areaOpacity?: number;
  lineTension?: number;
}

export interface BoxplotChartConfig {
  boxWidth?: number;
  orientation?: 'horizontal' | 'vertical';
  barCornerRadius?: number;
  showBoxplotPoints?: boolean;
  barBorderColor?: string;
  barBorderWidth?: number;
}
