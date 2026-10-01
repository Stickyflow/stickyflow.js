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

export interface Chart extends ChartBase {
  chart_type: ChartType;
  config?: ChartConfig;
}

export interface BarChart extends ChartBase {
  chart_type: 'bar';
  config?: BarChartConfig;
}

export interface LineChart extends ChartBase {
  chart_type: 'line';
  config?: LineChartConfig;
}

export interface ScatterChart extends ChartBase {
  chart_type: 'scatter';
  config?: CategoryChartConfig;
}

export interface BoxplotChart extends ChartBase {
  chart_type: 'boxplot';
  config?: BoxplotChartConfig;
}

export interface FieldChart extends ChartBase {
  chart_type: 'field';
  config?: FieldChartConfig;
}

export interface HeatmapChart extends ChartBase {
  chart_type: 'heatmap';
  config?: HeatmapChartConfig;
}

export interface HexbinChart extends ChartBase {
  chart_type: 'hexbin';
  config?: HexbinChartConfig;
}

export interface MekkoChart extends ChartBase {
  chart_type: 'mekko';
  config?: MekkoChartConfig;
}

export interface PieChart extends ChartBase {
  chart_type: 'pie' | 'polarArea';
  config?: PieChartConfig;
}

export interface RadarChart extends ChartBase {
  chart_type: 'radar' | 'radial';
  config?: RadarChartConfig;
}

export interface RadialBarChart extends ChartBase {
  chart_type: 'radialBar';
  config?: RadialBarChartConfig;
}

export interface SankeyChart extends ChartBase {
  chart_type: 'sankey';
  config?: SankeyChartConfig;
}

export interface TreemapChart extends ChartBase {
  chart_type: 'treemap';
  config?: TreemapChartConfig;
}

export interface CustomChart extends ChartBase {
  chart_type: 'custom';
  config?: CustomChartConfig;
}
