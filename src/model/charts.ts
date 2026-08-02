export type ChartType = 'bar' | 'line' | 'scatter';
export interface ChartAxis { min: number; max: number; step: number; label?: string }
export interface ChartSeries { id: string; label: string; color?: string; values: number[] | [number, number][] }

export interface Chart {
  id: string;
  x: number; y: number; width: number; height: number;
  title?: string | null;
  chart_type: ChartType;
  axis_x: ChartAxis;
  axis_y: ChartAxis;
  series: ChartSeries[];
  stroke_color?: string;
  stroke_width?: number;
  corner_radius?: number;
  fill_color?: string;
  grid_color?: string;
  grid_width?: number;
  text_color?: string;
  font_family?: string;
  font_size?: number;
  show_grid?: boolean;
  show_axis_labels?: boolean;
  show_legend?: boolean;
  order?: number;
  is_visible?: boolean;
}
