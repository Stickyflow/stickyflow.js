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

export interface RenderableChart<TType extends ChartType = ChartType, TConfig extends object = UnnarrowedChartConfig>
  extends ChartBase {
  chart_type: TType;
  config?: TConfig;
}

export interface BarChart extends RenderableChart<'bar', BarChartConfig> {}

export interface LineChart extends RenderableChart<'line', LineChartConfig> {}

export interface ScatterChart extends RenderableChart<'scatter', CategoryChartConfig> {}

export interface BoxplotChart extends RenderableChart<'boxplot', BoxplotChartConfig> {}

export interface FieldChart extends RenderableChart<'field', FieldChartConfig> {}

export interface HeatmapChart extends RenderableChart<'heatmap', HeatmapChartConfig> {}

export interface HexbinChart extends RenderableChart<'hexbin', HexbinChartConfig> {}

export interface MekkoChart extends RenderableChart<'mekko', MekkoChartConfig> {}

export interface PieChart extends RenderableChart<'pie' | 'polarArea', PieChartConfig> {}

export interface RadarChart extends RenderableChart<'radar' | 'radial', RadarChartConfig> {}

export interface RadialBarChart extends RenderableChart<'radialBar', RadialBarChartConfig> {}

export interface SankeyChart extends RenderableChart<'sankey', SankeyChartConfig> {}

export interface TreemapChart extends RenderableChart<'treemap', TreemapChartConfig> {}

export interface CustomChart extends RenderableChart<'custom', CustomChartConfig> {}

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
