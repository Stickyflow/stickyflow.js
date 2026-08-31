import type { Chart, ChartAxis, ChartZone } from '../model/charts';
import type { GradientColorObject, MeshGradientObject } from '../model/shapes';
import { DEFAULT_FONT, finite } from './renderPrimitives';
import type { Bounds, RenderNode, SceneText } from './renderScene';

export const formatFieldValue = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');

export function representativeColor(
  value: string | GradientColorObject | MeshGradientObject | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (value.type === 'gradient') return value.stops[0]?.color ?? fallback;
  return value.points[0]?.color ?? fallback;
}

export const CHART_COLORS = ['#7c3aed', '#0ea5e9', '#f97316', '#10b981', '#ec4899', '#eab308'];
export const mapChartValue = (value: number, axis: ChartAxis, extent: number): number =>
  axis.max === axis.min ? 0 : ((value - axis.min) / (axis.max - axis.min)) * extent;
export function chartTicks(axis: ChartAxis): number[] {
  if (!(axis.step > 0)) return axis.min === axis.max ? [axis.min] : [axis.min, axis.max];
  const ticks: number[] = [];
  for (let value = axis.min; value <= axis.max + 1e-9 && ticks.length < 1000; value += axis.step)
    ticks.push(Math.round(value * 1000) / 1000);
  return ticks;
}

export function chartText(
  id: string,
  order: number,
  bounds: Bounds,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  chart: Chart,
  align: 'left' | 'center' | 'right' = 'left',
  rotation?: number,
): SceneText {
  return {
    type: 'text',
    id,
    order,
    bounds,
    x,
    y,
    width,
    height,
    lines: [text],
    fontFamily: chart.font_family ?? DEFAULT_FONT,
    fontSize: Math.max(9, finite(chart.font_size, 12)),
    fontWeight: 'normal',
    color: chart.text_color ?? '#0f172a',
    align,
    verticalAlign: 'top',
    lineHeight: 1.2,
    rotation,
    rotationCenter: rotation ? { x, y } : undefined,
  };
}

export const DEFAULT_ZONE_FILL = '#94a3b8';
export const DEFAULT_HEATMAP_ZONES: ChartZone[] = [
  { label: 'Low', color: '#ddd6fe' },
  { label: 'Medium', color: '#a78bfa' },
  { label: 'High', color: '#6d28d9' },
];
export const DEFAULT_HEX_RADIUS = 14;

export function axisBands(axis: ChartAxis): number[] {
  const thresholds = [...(axis.thresholds ?? [])].filter(t => t > axis.min && t < axis.max).sort((a, b) => a - b);
  return [axis.min, ...thresholds, axis.max];
}

export function bandIndexForValue(value: number, bands: number[]): number {
  for (let i = 0; i < bands.length - 2; i++) if (value < bands[i + 1]) return i;
  return Math.max(0, bands.length - 2);
}

function quantile(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const h = (n - 1) * p,
    lo = Math.floor(h),
    hi = Math.ceil(h);
  return lo === hi ? sorted[lo] : sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

interface BoxplotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export function computeBoxplotStats(values: number[]): BoxplotStats | null {
  if (!values?.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
}

export function contrastTextColor(hex: string | undefined): string {
  if (hex?.[0] !== '#') return '#0f172a';
  const digits =
    hex.length === 4
      ? hex
          .slice(1)
          .split('')
          .map(c => parseInt(c + c, 16))
      : [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const [r, g, b] = digits;
  if ([r, g, b].some(c => Number.isNaN(c))) return '#0f172a';
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#0f172a' : '#ffffff';
}

export function errorBarRange(value: number, error: number | [number, number]): [number, number] {
  return Array.isArray(error) ? [value - error[0], value + error[1]] : [value - error, value + error];
}

const ERROR_CAP_HALF = 5;

export function errorWhiskerNode(
  id: string,
  order: number,
  bounds: Bounds,
  center: number,
  y1: number,
  y2: number,
  color: string,
  series?: string,
  valueIndex?: number,
): RenderNode {
  const d = `M ${center} ${y1} L ${center} ${y2} M ${center - ERROR_CAP_HALF} ${y1} L ${center + ERROR_CAP_HALF} ${y1} M ${center - ERROR_CAP_HALF} ${y2} L ${center + ERROR_CAP_HALF} ${y2}`;
  return {
    type: 'path',
    id,
    order,
    bounds,
    d,
    sfSeries: series,
    sfValueIndex: valueIndex,
    style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color }, strokeWidth: 1 },
  };
}

export function stackedSegment(
  chart: Chart,
  mode: 'true' | 'percent' | 'waterfall',
  categoryIndex: number,
  seriesIndex: number,
  plotHeight: number,
): { value: number; pixelStart: number; pixelEnd: number } {
  const value = (chart.series[seriesIndex].values as number[])[categoryIndex] ?? 0;
  if (mode === 'waterfall') {
    let running = 0;
    for (let i = 0; i < categoryIndex; i++) running += (chart.series[seriesIndex].values as number[])[i] ?? 0;
    return {
      value,
      pixelStart: mapChartValue(running, chart.axis_y, plotHeight),
      pixelEnd: mapChartValue(running + value, chart.axis_y, plotHeight),
    };
  }
  if (mode === 'percent') {
    const total = chart.series.reduce((sum, s) => sum + Math.abs((s.values as number[])[categoryIndex] ?? 0), 0) || 1;
    let cum = 0;
    for (let i = 0; i < seriesIndex; i++) cum += Math.abs((chart.series[i].values as number[])[categoryIndex] ?? 0);
    const magnitude = Math.abs(value);
    return { value, pixelStart: (cum / total) * plotHeight, pixelEnd: ((cum + magnitude) / total) * plotHeight };
  }
  let cum = 0;
  for (let i = 0; i < seriesIndex; i++) cum += (chart.series[i].values as number[])[categoryIndex] ?? 0;
  return {
    value,
    pixelStart: mapChartValue(cum, chart.axis_y, plotHeight),
    pixelEnd: mapChartValue(cum + value, chart.axis_y, plotHeight),
  };
}
