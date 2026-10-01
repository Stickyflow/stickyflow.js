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
  axis_x: ChartAxis;
  axis_y: ChartAxis;
  series: ChartSeries[];
  rules?: ChartRule[];
  stroke_color?: string;
  stroke_width?: number;
  corner_radius?: number;
  fill_color?: string;
  grid_color?: string;
  grid_width?: number;
  grid_shape?: 'rect' | 'circle';
  grid_line_style?: 'solid' | 'dashed' | 'dotted';
  grid_rounded_corners?: boolean;
  text_color?: string;
  font_family?: string;
  font_size?: number;
  show_grid?: boolean;
  show_axis_labels?: boolean;
  show_legend?: boolean;
  legend_position?: 'top' | 'bottom' | 'bottomLeft' | 'bottomRight' | 'left' | 'right';
  shadow_style?: ShadowStyle;
  order?: number;
  is_visible?: boolean;
}

export interface TypedChart<TType extends ChartType = ChartType, TConfig extends object = UnnarrowedChartConfig>
  extends ChartBase {
  chart_type: TType;
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
