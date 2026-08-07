import type { GradientColor, MeshGradientColor, PatternColor } from './colors';

export type ChartType = 'bar' | 'line' | 'scatter' | 'radar' | 'radial' | 'matrix' | 'heatmap' | 'hexbin' | 'mekko' | 'treemap' | 'sankey' | 'pie' | 'boxplot';

export interface ChartAxis {
  min: number;
  max: number;
  step: number;
  label?: string;
  // Matrix: values within [min, max] that split this axis into position
  // bands. Heatmap/Treemap: axis_y only, splits the value range into color
  // bands (paired with ChartConfig.zones). Not used by cartesian/polar.
  thresholds?: number[];
  // Heatmap/Mekko: column header labels, one per value in each series'
  // `values` array. Bar/Boxplot: per-bar/box category name.
  categories?: string[];
}

export interface ChartZone {
  label: string;
  // A plain string is a solid hex color everywhere zones are used (matrix
  // quadrants, heatmap/treemap bands, sankey nodes). Gradient/mesh/pattern
  // objects only ever come from the bar/boxplot chart's per-category color
  // override - other consumers never allow anything but a solid string.
  color?: string | GradientColor | MeshGradientColor | PatternColor;
}

export interface ChartSeries {
  id: string;
  label: string;
  color?: string;
  opacity?: number;
  // Matrix bubble radius override.
  size?: number;
  // Treemap only: top-level branch this leaf belongs to.
  group?: string;
  // Sankey only: this series IS one flow link, source/target reference node
  // ids (= a node's `label` in chart.config.zones).
  source?: string;
  target?: string;
  values: number[] | [number, number][];
}

export interface ChartConfig {
  categories?: string[];
  areaOpacity?: number;
  // Matrix: named/colored quadrant cells. Heatmap/Treemap: ordered low->high
  // value color bands. Sankey: doubles as the node list. Bar: per-category
  // color override index-matched to axis_x.categories.
  zones?: ChartZone[];
  // Hexbin only: pixel radius of each hexagon cell.
  hexRadius?: number;
  // Polar (radar/radial)/Pie: pixel radius of a blank center hole.
  innerRadius?: number;
  // Polar only: hides the straight spoke lines. Defaults to true.
  showSpokes?: boolean;
  // Line only: 0 = straight polyline, >0 = smoothed curve.
  lineTension?: number;
  // Bar/Boxplot only: rotates the chart 90 degrees.
  horizontal?: boolean;
  // Bar/Boxplot only: corner rounding on each bar/box rectangle.
  barCornerRadius?: number;
  // Bar only: shows each bar's value as a text label.
  showBarLabels?: boolean;
  // Bar/Boxplot only: border around each bar/box.
  barBorderColor?: string;
  barBorderWidth?: number;
  // Boxplot only: shows each category's raw sample values as jittered dots.
  // Defaults to true.
  showBoxplotPoints?: boolean;
  // Boxplot only: width of each box as a fraction (0-1) of its category
  // slot. Defaults to 0.6.
  boxWidth?: number;
  // Mekko only: column height proportional to its share of the grand total
  // instead of always filling the full plot height.
  mekkoVaryHeight?: boolean;
  // Cartesian family only (bar/line/scatter/hexbin/boxplot): swaps the
  // numeric tick-driven grid/axis-labels for a plain sketch-style L-axis
  // (an arrow-tipped vertical line + a plain horizontal line meeting at the
  // plot's bottom-left corner) - no numeric ticks, no card border. Category
  // labels and axis_x/axis_y.label text still render normally.
  minimalAxes?: boolean;
}

export interface Chart {
  id: string;
  x: number; y: number; width: number; height: number;
  title?: string | null;
  chart_type: ChartType;
  axis_x: ChartAxis;
  axis_y: ChartAxis;
  config?: ChartConfig;
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
