import type { ShadowStyle } from './shadows';
import type { GradientColorObject, MeshGradientObject } from './shapes';

export type ChartType =
  | 'bar'
  | 'line'
  | 'scatter'
  | 'radar'
  | 'radial'
  | 'field'
  | 'heatmap'
  | 'boxplot'
  | 'sankey'
  | 'treemap'
  | 'mekko'
  | 'hexbin'
  | 'pie'
  | 'radialBar'
  | 'polarArea'
  | 'custom';

export const CHART_TYPES: ChartType[] = [
  'bar',
  'line',
  'scatter',
  'radar',
  'radial',
  'field',
  'heatmap',
  'boxplot',
  'sankey',
  'treemap',
  'mekko',
  'hexbin',
  'pie',
  'radialBar',
  'polarArea',
  'custom',
];

export function isChartType(value: string | undefined): value is ChartType {
  return value !== undefined && (CHART_TYPES as string[]).includes(value);
}

export const CIRCULAR_GRID_CHART_TYPES: ReadonlySet<ChartType> = new Set(['scatter', 'custom', 'hexbin']);

export interface ChartAxis {
  min: number;
  max: number;
  step: number;
  label?: string;
  unit?: string;
  thresholds?: number[];
}

export interface ChartZone {
  label: string;
  color?: string;
}
export interface ChartRamp {
  type: 'ramp';
  stops: Array<{ position: number; color: string }>;
}
export interface ChartSeries {
  id: string;
  label: string;
  color?: string | GradientColorObject | MeshGradientObject;
  colors?: Array<string | GradientColorObject | MeshGradientObject | null>;
  opacity?: number;
  group?: string;
  values: number[] | [number, number][] | [number, number, number][] | [number, number, number, number][];
  error?: Array<number | [number, number] | null>;
  source?: string;
  target?: string;
  size?: number;
  symbol?: { points: Array<[number, number]>; normalized?: boolean; tension?: number };
  stroke?: string;
  stroke_width?: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
}

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
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string | null;
  chart_type: ChartType;
  axis_x: ChartAxis;
  axis_y: ChartAxis;
  config?: {
    categories?: string[];
    areaOpacity?: number;
    zones?: ChartZone[];
    boxWidth?: number;
    orientation?: 'horizontal' | 'vertical';
    lineTension?: number;
    barCornerRadius?: number;
    showBoxplotPoints?: boolean;
    barBorderColor?: string;
    barBorderWidth?: number;
    stacked?: 'none' | 'true' | 'percent' | 'waterfall';
    mekkoVaryHeight?: boolean;
    hexRadius?: number;
    innerRadius?: number;
    pieCornerRadius?: number;
    pieSliceGap?: number;
    ringThickness?: number;
    ringGap?: number;
    cellGap?: number;
    showValues?: boolean;
    squareCells?: boolean;
    headerColor?: string;
    tileGradient?: boolean;
    showColumnBackdrop?: boolean;
    labelPosition?: 'outside' | 'inside';
    labelOrientation?: 'horizontal' | 'vertical';
    labelColor?: string;
    linkGradient?: boolean;
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
