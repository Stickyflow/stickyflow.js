import type { GradientColor, MeshGradientColor } from '../color';
import type { ShadowStyle } from '../shadow';
import type { ChartRule } from './annotations';
import type { ChartAxis } from './axis';
import type {
  BarChartConfig,
  BoxplotChartConfig,
  ChartConfigCapabilities,
  CustomChartConfig,
  FieldChartConfig,
  HeatmapChartConfig,
  HexbinChartConfig,
  LineChartConfig,
  MekkoChartConfig,
  PieChartConfig,
  PolarAreaChartConfig,
  RadarChartConfig,
  RadialBarChartConfig,
  RadialChartConfig,
  SankeyChartConfig,
  ScatterChartConfig,
  TreemapChartConfig,
} from './configs';
import type { ChartSeries } from './series';
import type { ChartType } from './supportedTypes';

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
  fillColor?: string | GradientColor | MeshGradientColor;
  fillImage?: { url: string; overlay?: string };
  gridColor?: string;
  gridWidth?: number;
  gridShape?: 'rect' | 'circle';
  gridLineStyle?: 'solid' | 'dashed' | 'dotted';
  gridRoundedCorners?: boolean;
  textColor?: string;
  axisLabelColor?: string;
  legendColor?: string;
  // The space between the grid of a heatmap and its color bar, in pixels.
  legendGap?: number;
  axisLineWidth?: number;
  axisLineColor?: string;
  axisLineStyle?: 'solid' | 'dashed' | 'dotted';
  tickLength?: number;
  axisFontSize?: number;
  // How far the labels along the axes stand up, from 0 (flat) to 90 (upright).
  axisLabelAngle?: number;
  // The room for the names beside the data, in pixels. Left out, it is as much as the longest name needs.
  axisLabelSpace?: number;
  // How the names beside a heatmap sit in their room: against the data (right) or at the outer edge (left).
  // Which side of a heatmap the names of its rows and of its columns, and its color bar, sit at.
  rowLabelSide?: 'left' | 'right';
  columnLabelSide?: 'top' | 'bottom';
  legendSide?: 'top' | 'bottom' | 'left' | 'right';
  // The distance between the labels and the graphic, in pixels: along the x axis and along the y axis.
  xLabelGap?: number;
  yLabelGap?: number;
  axisLabelAlign?: 'left' | 'center' | 'right';
  axisFontFamily?: string;
  showValueAxis?: boolean;
  categoryAlign?: 'center' | 'left' | 'inside';
  titleSize?: number;
  // Where the title stands over the chart.
  titleAlign?: 'left' | 'center' | 'right';
  titleWeight?: 'normal' | 'bold';
  titleColor?: string;
  gridAxes?: 'both' | 'x' | 'y';
  fontFamily?: string;
  fontSize?: number;
  showGrid?: boolean;
  showAxisLabels?: boolean;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'bottomLeft' | 'bottomRight' | 'left' | 'right';
  shadowStyle?: ShadowStyle;
  order?: number;
  sourceIndex?: number;
  isVisible?: boolean;
}

export interface TypedChart<TType extends ChartType = ChartType, TConfig extends object = ChartConfigCapabilities>
  extends ChartBase {
  chartType: TType;
  config?: TConfig;
}

export interface BarChart extends TypedChart<'bar', BarChartConfig> {}

export interface LineChart extends TypedChart<'line', LineChartConfig> {}

export interface ScatterChart extends TypedChart<'scatter', ScatterChartConfig> {}

export interface BoxplotChart extends TypedChart<'boxplot', BoxplotChartConfig> {}

export interface FieldChart extends TypedChart<'field', FieldChartConfig> {}

export interface HeatmapChart extends TypedChart<'heatmap', HeatmapChartConfig> {}

export interface HexbinChart extends TypedChart<'hexbin', HexbinChartConfig> {}

export interface MekkoChart extends TypedChart<'mekko', MekkoChartConfig> {}

export interface PieChart extends TypedChart<'pie', PieChartConfig> {}

export interface PolarAreaChart extends TypedChart<'polarArea', PolarAreaChartConfig> {}

export interface RadarChart extends TypedChart<'radar', RadarChartConfig> {}

export interface RadialChart extends TypedChart<'radial', RadialChartConfig> {}

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
  | PolarAreaChart
  | RadarChart
  | RadialBarChart
  | RadialChart
  | SankeyChart
  | ScatterChart
  | TreemapChart;
