import type { GradientColorObject, MeshGradientObject } from './shapes';

export type ChartType = 'bar' | 'line' | 'scatter' | 'radar' | 'radial' | 'field' | 'heatmap' | 'boxplot' | 'sankey' | 'treemap' | 'mekko' | 'hexbin' | 'pie' | 'matrix' | 'grid' | 'custom';

/** Every `type:` value a Chart block can carry, as a real runtime array
 *  (`ChartType` itself only exists at compile time) — same pattern as
 *  `SHAPE_TYPES`. The renderer checks incoming charts against this so an
 *  unsupported type is reported rather than silently drawn as something else;
 *  a host building a chart-type picker can iterate it for the same reason. */
export const CHART_TYPES: ChartType[] = ['bar', 'line', 'scatter', 'radar', 'radial', 'field', 'heatmap', 'boxplot', 'sankey', 'treemap', 'mekko', 'hexbin', 'pie', 'matrix', 'grid', 'custom'];
export interface ChartAxis {
  min: number; max: number; step: number; label?: string;
  // SFL 1.4, §5.4: the axis's unit of measure ("k€", "%", "days"…) - purely
  // semantic, not how it's drawn, applies to either axis.
  unit?: string;
  // Heatmap (axis_y only) and matrix (both axes): values within [min, max]
  // that split the value range into color bands, paired with
  // ChartConfig.zones (one more zone than thresholds - N thresholds make
  // N+1 bands). Sorted ascending; ignored by every other chart family.
  thresholds?: number[];
}

// Heatmap/treemap: a named, colored value band (axis_y.thresholds bucket a
// value into one of these). Sankey reuses the same shape for a different
// purpose - each zone IS a node (label = node id/display name, color = that
// node's fill), not a value band. Matrix does too in stickyflow-atlas; this
// package doesn't draw matrix yet. A plain string color, not a gradient/
// mesh/pattern union like atlas's ChartZone - atlas's own comment on that
// field notes a heatmap zone never actually receives anything but a solid
// color in practice, so there's nothing to widen this for yet.
export interface ChartZone {
  label: string;
  color?: string;
}
// Fields §3.4: continuous value -> color, stops keyed by LITERAL value
// position (the field's own data range), not 0-100% fractions like a shape
// gradient - see entities/charts/ui/field.ts in stickyflow-atlas for why.
export interface ChartRamp {
  type: 'ramp';
  stops: Array<{ position: number; color: string }>;
}
export interface ChartSeries {
  id: string; label: string;
  // A gradient (or mesh, though a single-hue-family mark rarely wants one)
  // draws exactly like a shape's fillColor does - same GradientColorObject
  // shape, same paint() in buildRenderScene.ts. Bar/line/point/legend-swatch
  // marks read this directly; zone-bucketed marks (heatmap cells, treemap/
  // mekko/matrix zone fills, sankey nodes/links) are colored from
  // ChartZone.color instead and don't go through this field.
  color?: string | GradientColorObject | MeshGradientObject; opacity?: number;
  // Fields §3.4: a 3-tuple is a scalar sample [x, y, value] (feeds the
  // interpolated surface + isolines), a 4-tuple is a vector sample
  // [x, y, angle, magnitude] (drawn as an arrow glyph, no interpolation).
  values: number[] | [number, number][] | [number, number, number][] | [number, number, number, number][];
  // Bar/line only (SFL 1.4, §5.4.5): error magnitude per point, index-aligned
  // with `values`. A plain number is symmetric (value ± number); a
  // [low, high] pair is asymmetric. `null` at an index means "no error bar
  // for this point" without breaking the index alignment.
  error?: Array<number | [number, number] | null>;
  // Sankey only: a series IS a flow between two nodes (config.zones' labels)
  // instead of point data - `values[0]` is the flow's magnitude.
  source?: string;
  target?: string;
  // Matrix only: this series' point-mark radius in pixels, overriding the
  // chart's own default mark size.
  size?: number;
  // Custom only: draws this series as a closed polygon glyph at each data
  // point instead of the usual bar/line/dot mark - `points` are offsets in
  // local mark-space (not data units), traced in order and closed.
  symbol?: { points: Array<[number, number]> };
  stroke?: string;
  stroke_width?: number;
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
    // Heatmap only: axis_x's column headers - reuses this same field radar
    // already uses for its own category labels, rather than a chart-family-
    // specific spot on ChartAxis. Row headers come from each Series' own
    // `label` instead (Series is already the addressable per-row block).
    // Ordered low -> high color bands for axis_y.thresholds (one more zone
    // than thresholds) - conditional-formatting-style value coloring, not a
    // position grid.
    zones?: ChartZone[];
    // Boxplot only.
    boxWidth?: number; barCornerRadius?: number; showBoxplotPoints?: boolean;
    barBorderColor?: string; barBorderWidth?: number;
    // Bar only (SFL 1.4, §5.4.1): how series at the same category relate to
    // each other. 'none'/absent = today's grouped side-by-side bars.
    // 'true'/'percent' = cumulative stack across series at one category
    // (raw or normalized to 100%). 'waterfall' = a bar's baseline floats
    // with the running total of ITS OWN prior categories.
    stacked?: 'none' | 'true' | 'percent' | 'waterfall';
    // Mekko only: column HEIGHT is proportional to that column's share of the
    // grand total instead of every column filling the full plot height.
    // Column WIDTH is always proportional to its total regardless of this
    // flag - that's Mekko's defining trait, not optional. Defaults to false.
    mekkoVaryHeight?: boolean;
    // Hexbin only: pixel radius of each hexagon cell.
    hexRadius?: number;
    // Pie only: >0 turns the disc into a donut, punching a hole of this
    // pixel radius through its center. 0/absent is a solid pie.
    innerRadius?: number;
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
