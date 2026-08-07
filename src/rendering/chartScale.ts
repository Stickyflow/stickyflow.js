// Shared pure chart-geometry helpers, used by buildChart's per-family
// renderers in buildRenderScene.ts. No framework dependency - same
// functions (by contract) as the main app's entities/charts/ui/chartScale.ts,
// ported so a chart's SFL data renders identically in both.
import type { ChartAxis, ChartZone } from '../model/charts';

/** Narrows a zone color to a plain string, discarding a gradient/mesh/
 * pattern object - used by matrix/heatmap/treemap/sankey/mekko, none of
 * which ever produce anything but a solid string in practice (only bar/
 * boxplot's per-category override can be richer - see chartZoneFill in
 * buildRenderScene.ts, which handles the full ColorValue range instead). */
export function zoneSolidColor(color: ChartZone['color']): string | undefined {
  return typeof color === 'string' ? color : undefined;
}

/** Maps a data value to a pixel offset along one axis extent. */
export function mapValueToPixel(value: number, axis: ChartAxis, extentPx: number): number {
  const range = axis.max - axis.min;
  if (range === 0) return 0;
  return ((value - axis.min) / range) * extentPx;
}

/** Implicit numeric x value for a bar/line series item. */
export function indexedAxisValue(index: number, axis: ChartAxis): number {
  return axis.min + index * axis.step;
}

/** Tick values from min to max (inclusive) at `step` intervals. */
export function ticksFor(axis: ChartAxis): number[] {
  if (!(axis.step > 0)) return axis.min === axis.max ? [axis.min] : [axis.min, axis.max];
  const ticks: number[] = [];
  for (let v = axis.min; v <= axis.max + 1e-9 && ticks.length < 1000; v += axis.step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}

/** Sorted band boundaries an axis's `thresholds` split it into, including
 * min/max as the outer edges - N in-range thresholds produce N+1 bands. */
export function axisBands(axis: ChartAxis): number[] {
  const thresholds = [...(axis.thresholds ?? [])]
    .filter(t => t > axis.min && t < axis.max)
    .sort((a, b) => a - b);
  return [axis.min, ...thresholds, axis.max];
}

/** Index of the band (from axisBands) a value falls into - values outside
 * [min, max] clamp into the outermost band. */
export function bandIndexForValue(value: number, bands: number[]): number {
  for (let i = 0; i < bands.length - 2; i++) if (value < bands[i + 1]) return i;
  return Math.max(0, bands.length - 2);
}

/** Black or white, whichever reads better on top of the given hex fill. */
export function contrastTextColor(hex: string | undefined): string {
  if (!hex || hex[0] !== '#') return '#0f172a';
  const digits = hex.length === 4
    ? hex.slice(1).split('').map(c => parseInt(c + c, 16))
    : [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const [r, g, b] = digits;
  if ([r, g, b].some(c => Number.isNaN(c))) return '#0f172a';
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#0f172a' : '#ffffff';
}

function quantile(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const h = (n - 1) * p;
  const lo = Math.floor(h), hi = Math.ceil(h);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

export interface BoxplotStats { min: number; q1: number; median: number; q3: number; max: number; }

/** Five-number summary of a category's raw sample values - null for an
 * empty series. Whiskers are the true min/max of the sample, not an
 * IQR-based outlier cutoff. */
export function computeBoxplotStats(values: number[]): BoxplotStats | null {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
}
