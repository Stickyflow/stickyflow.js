import type { ShadowStyle } from '../shadows';
import type { ChartRule } from './annotations';
import type { ChartAxis } from './axis';
import type { ChartType } from './catalog';
import type {
  BarChartConfig,
  BoxplotChartConfig,
  CategoryChartConfig,
  ChartConfig,
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

export interface RenderableChart extends ChartBase {
  chart_type: ChartType;
  config?: ChartConfig;
}

export interface BarChart extends RenderableChart {
  chart_type: 'bar';
  config?: BarChartConfig;
}

export interface LineChart extends RenderableChart {
  chart_type: 'line';
  config?: LineChartConfig;
}

export interface ScatterChart extends RenderableChart {
  chart_type: 'scatter';
  config?: CategoryChartConfig;
}

export interface BoxplotChart extends RenderableChart {
  chart_type: 'boxplot';
  config?: BoxplotChartConfig;
}

export interface FieldChart extends RenderableChart {
  chart_type: 'field';
  config?: FieldChartConfig;
}

export interface HeatmapChart extends RenderableChart {
  chart_type: 'heatmap';
  config?: HeatmapChartConfig;
}

export interface HexbinChart extends RenderableChart {
  chart_type: 'hexbin';
  config?: HexbinChartConfig;
}

export interface MekkoChart extends RenderableChart {
  chart_type: 'mekko';
  config?: MekkoChartConfig;
}

export interface PieChart extends RenderableChart {
  chart_type: 'pie' | 'polarArea';
  config?: PieChartConfig;
}

export interface RadarChart extends RenderableChart {
  chart_type: 'radar' | 'radial';
  config?: RadarChartConfig;
}

export interface RadialBarChart extends RenderableChart {
  chart_type: 'radialBar';
  config?: RadialBarChartConfig;
}

export interface SankeyChart extends RenderableChart {
  chart_type: 'sankey';
  config?: SankeyChartConfig;
}

export interface TreemapChart extends RenderableChart {
  chart_type: 'treemap';
  config?: TreemapChartConfig;
}

export interface CustomChart extends RenderableChart {
  chart_type: 'custom';
  config?: CustomChartConfig;
}

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
