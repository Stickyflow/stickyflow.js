export type ChartType = 'bar' | 'line' | 'scatter' | 'radar' | 'radial';
export interface ChartAxis {
  min: number; max: number; step: number; label?: string;
  // SFL 1.4, §5.4: the axis's unit of measure ("k€", "%", "days"…) - purely
  // semantic, not how it's drawn, applies to either axis.
  unit?: string;
}
export interface ChartSeries {
  id: string; label: string; color?: string; opacity?: number;
  values: number[] | [number, number][];
  // Bar/line only (SFL 1.4, §5.4.5): error magnitude per point, index-aligned
  // with `values`. A plain number is symmetric (value ± number); a
  // [low, high] pair is asymmetric. `null` at an index means "no error bar
  // for this point" without breaking the index alignment.
  error?: Array<number | [number, number] | null>;
}

// Chart's second addressable leaf alongside Series (SFL 1.4, §1.2/§5.4.8): a
// reference line at a fixed position on the value axis - a target, mean, or
// benchmark, not a data point.
export interface ChartRule {
  id: string;
  at: number;
  text?: string;
  color?: string;
  stroke_width?: number;
  dash?: number[];
}

export interface Chart {
  id: string;
  x: number; y: number; width: number; height: number;
  title?: string | null;
  chart_type: ChartType;
  axis_x: ChartAxis;
  axis_y: ChartAxis;
  config?: {
    categories?: string[]; areaOpacity?: number;
    // Bar only (SFL 1.4, §5.4.1): how series at the same category relate to
    // each other. 'none'/absent = today's grouped side-by-side bars.
    // 'true'/'percent' = cumulative stack across series at one category
    // (raw or normalized to 100%). 'waterfall' = a bar's baseline floats
    // with the running total of ITS OWN prior categories.
    stacked?: 'none' | 'true' | 'percent' | 'waterfall';
  };
  series: ChartSeries[];
  rules?: ChartRule[];
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
