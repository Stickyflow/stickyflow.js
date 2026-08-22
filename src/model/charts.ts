export type ChartType = 'bar' | 'line' | 'scatter' | 'radar' | 'radial' | 'field';

/** Every `type:` value a Chart block can carry, as a real runtime array
 *  (`ChartType` itself only exists at compile time) — same pattern as
 *  `SHAPE_TYPES`. The renderer checks incoming charts against this so an
 *  unsupported type is reported rather than silently drawn as something else;
 *  a host building a chart-type picker can iterate it for the same reason.
 *
 *  Deliberately narrower than stickyflow-atlas's own union: atlas additionally
 *  draws heatmap/hexbin/sankey/treemap/pie/boxplot/matrix/mekko/grid/custom,
 *  none of which this package implements yet. */
export const CHART_TYPES: ChartType[] = ['bar', 'line', 'scatter', 'radar', 'radial', 'field'];
export interface ChartAxis {
  min: number; max: number; step: number; label?: string;
  // SFL 1.4, §5.4: the axis's unit of measure ("k€", "%", "days"…) - purely
  // semantic, not how it's drawn, applies to either axis.
  unit?: string;
}
// Fields §3.4: continuous value -> color, stops keyed by LITERAL value
// position (the field's own data range), not 0-100% fractions like a shape
// gradient - see entities/charts/ui/field.ts in stickyflow-atlas for why.
export interface ChartRamp {
  type: 'ramp';
  stops: Array<{ position: number; color: string }>;
}
export interface ChartSeries {
  id: string; label: string; color?: string; opacity?: number;
  // Fields §3.4: a 3-tuple is a scalar sample [x, y, value] (feeds the
  // interpolated surface + isolines), a 4-tuple is a vector sample
  // [x, y, angle, magnitude] (drawn as an arrow glyph, no interpolation).
  values: number[] | [number, number][] | [number, number, number][] | [number, number, number, number][];
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
    // Fields §3.4.
    scale?: ChartRamp;
    interpolate?: 'idw';
    idwPower?: number;
    isolines?: number[];
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
