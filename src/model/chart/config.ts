import type { ChartRamp, ChartZone } from './data';

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

export interface FieldChartConfig {
  scale?: ChartRamp;
  interpolate?: 'idw';
  idwPower?: number;
  isolines?: number[];
}

export interface HeatmapChartConfig extends CategoryChartConfig {
  zones?: ChartZone[];
  cellGap?: number;
  showValues?: boolean;
  squareCells?: boolean;
  barCornerRadius?: number;
}

export interface MekkoChartConfig extends CategoryChartConfig {
  barCornerRadius?: number;
  mekkoVaryHeight?: boolean;
  tileGradient?: boolean;
  showColumnBackdrop?: boolean;
}

export interface HexbinChartConfig {
  hexRadius?: number;
}

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

export interface SankeyChartConfig {
  zones?: ChartZone[];
  barCornerRadius?: number;
  labelPosition?: 'outside' | 'inside';
  labelOrientation?: 'horizontal' | 'vertical';
  labelColor?: string;
  linkGradient?: boolean;
}

export interface TreemapChartConfig {
  zones?: ChartZone[];
  cellGap?: number;
  barCornerRadius?: number;
  headerColor?: string;
  tileGradient?: boolean;
}

export interface CustomChartConfig extends CategoryChartConfig {
  zones?: ChartZone[];
  orientation?: 'horizontal' | 'vertical';
  connectPoints?: boolean;
  reverseComparison?: boolean;
}

export interface ChartConfig
  extends BarChartConfig,
    BoxplotChartConfig,
    CustomChartConfig,
    FieldChartConfig,
    HeatmapChartConfig,
    HexbinChartConfig,
    LineChartConfig,
    MekkoChartConfig,
    PieChartConfig,
    RadarChartConfig,
    RadialBarChartConfig,
    SankeyChartConfig,
    TreemapChartConfig {}
