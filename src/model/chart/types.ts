import type { ShadowStyle } from '../shadows';
import type { ChartType } from './catalog';
import type { ChartConfig } from './config';
import type { ChartAxis, ChartRule, ChartSeries } from './data';

export interface Chart {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string | null;
  chart_type: ChartType;
  axis_x: ChartAxis;
  axis_y: ChartAxis;
  config?: ChartConfig;
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
