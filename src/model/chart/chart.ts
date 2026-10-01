import type { ShadowStyle } from '../shadow';
import type { ChartRule } from './annotations';
import type { ChartAxis } from './axis';
import type { ChartType } from './catalog';
import type {
  BarChartConfig,
  BoxplotChartConfig,
  CategoryChartConfig,
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
  TreemapChartConfig,
  UnnarrowedChartConfig,
} from './configs';
import type { ChartSeries } from './series';

export interface ChartBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string | null;
  axisX: ChartAxis;
  axisY: ChartAxis;
  series: ChartSeries[];
  rules?: ChartRule[];
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  fillColor?: string;
  gridColor?: string;
  gridWidth?: number;
  gridShape?: 'rect' | 'circle';
  gridLineStyle?: 'solid' | 'dashed' | 'dotted';
  gridRoundedCorners?: boolean;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  showGrid?: boolean;
  showAxisLabels?: boolean;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'bottomLeft' | 'bottomRight' | 'left' | 'right';
  shadowStyle?: ShadowStyle;
  order?: number;
  isVisible?: boolean;
}

export interface TypedChart<TType extends ChartType = ChartType, TConfig extends object = UnnarrowedChartConfig>
  extends ChartBase {
  chartType: TType;
  config?: TConfig;
}

export interface BarChart extends TypedChart<'bar', BarChartConfig> {}

export interface LineChart extends TypedChart<'line', LineChartConfig> {}

export interface ScatterChart extends TypedChart<'scatter', CategoryChartConfig> {}

export interface BoxplotChart extends TypedChart<'boxplot', BoxplotChartConfig> {}

export interface FieldChart extends TypedChart<'field', FieldChartConfig> {}

export interface HeatmapChart extends TypedChart<'heatmap', HeatmapChartConfig> {}

export interface HexbinChart extends TypedChart<'hexbin', HexbinChartConfig> {}

export interface MekkoChart extends TypedChart<'mekko', MekkoChartConfig> {}

export interface PieChart extends TypedChart<'pie' | 'polarArea', PieChartConfig> {}

export interface RadarChart extends TypedChart<'radar' | 'radial', RadarChartConfig> {}

export interface RadialBarChart extends TypedChart<'radialBar', RadialBarChartConfig> {}

export interface SankeyChart extends TypedChart<'sankey', SankeyChartConfig> {}

export interface TreemapChart extends TypedChart<'treemap', TreemapChartConfig> {}

export interface CustomChart extends TypedChart<'custom', CustomChartConfig> {}

export type Chart =
  | BarChart
  | BoxplotChart
  | CustomChart
  | FieldChart
  | HeatmapChart
  | HexbinChart
  | LineChart
  | MekkoChart
  | PieChart
  | RadarChart
  | RadialBarChart
  | SankeyChart
  | ScatterChart
  | TreemapChart;
