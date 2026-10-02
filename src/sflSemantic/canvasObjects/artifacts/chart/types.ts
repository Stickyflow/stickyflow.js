import type { SflValue } from '../../../../sflLanguage/ast';
import type { SflCanvasObject } from '../../types';

export type ChartProperties = Map<string, SflValue>;

export interface SflChartData {
  chartType:
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
  categories?: string[];
  areaOpacity?: number;
  stacked?: 'true' | 'percent' | 'waterfall';
  scale?: string;
  interpolate?: 'idw';
  idwPower?: number;
  isolines?: number[];
  zones?: Array<{ label: string; color?: string }>;
  boxWidth?: number;
  orientation?: 'horizontal' | 'vertical';
  lineTension?: number;
  barCornerRadius?: number;
  showBoxplotPoints?: boolean;
  barBorderColor?: string;
  barBorderWidth?: number;
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
  connectPoints?: boolean;
  reverseComparison?: boolean;
  axisX: { min: number; max: number; step: number; label?: string; unit?: string; thresholds?: number[] };
  axisY: { min: number; max: number; step: number; label?: string; unit?: string; thresholds?: number[] };
  series: SflChartSeries[];
  rules: Array<{ id: string; at: number; text?: string; color?: string; strokeWidth?: number; dash?: number[] }>;
}

export interface SflChartSeries {
  id: string;
  label: string;
  color?: string;
  colors?: Array<string | null>;
  opacity?: number;
  group?: string;
  values: number[] | [number, number][] | [number, number, number][] | [number, number, number, number][];
  error?: Array<number | [number, number] | null>;
  source?: string;
  target?: string;
  size?: number;
  symbol?: { points: Array<[number, number]>; normalized?: boolean; tension?: number };
  stroke?: string;
  strokeWidth?: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
}

export type ChartData = SflChartData;
export type ChartSeries = SflChartSeries;

export type SflChartObject = SflCanvasObject & {
  objectType: 'chart';
  chart: SflChartData;
};

export function isChartObject(canvasObject: SflCanvasObject): canvasObject is SflChartObject {
  return canvasObject.objectType === 'chart' && canvasObject.chart !== undefined;
}
