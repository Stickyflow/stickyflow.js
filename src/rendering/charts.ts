import { CHART_TYPES, type Chart, type ChartAxis, type ChartZone } from '../model/charts';
import type { GradientColorObject, MeshGradientObject } from '../model/shapes';
import { layoutSankey } from '../model/geometry/sankey';
import { squarifyTreemap } from '../model/geometry/treemap';
import { computeHexBins } from '../model/geometry/hexbin';
import { colorAtRamp, computeFieldGrid, type FieldSample } from './field';
import { computeIsolineSegments } from './isolines';
import { wrapText } from '../model/geometry/text';
import type { Bounds, RenderDiagnostic, RenderNode, SceneStyle, SceneText } from './renderScene';
import { DEFAULT_FONT, finite, orderOf, boxBounds, paint, freeformPathData } from './renderPrimitives';

// Fields §3.4: colorbar min/max labels.
const formatFieldValue = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ''));

// A flat string stand-in for a Series.color that may now be a gradient, for
// the few spots that can't paint one: contrastTextColor() needs one real
// color to compute against, and layoutSankey()'s graph layout only ever
// carries color as opaque string data (same reason ChartZone.color itself
// stays string-only - see its own comment in model/charts.ts). The
// gradient's first stop stands in either way, so a series that's a gradient
// everywhere else still reads as its own color there, not a fallback grey.
function representativeColor(value: string | GradientColorObject | MeshGradientObject | undefined, fallback: string): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (value.type === 'gradient') return value.stops[0]?.color ?? fallback;
  return value.points[0]?.color ?? fallback;
}

const CHART_COLORS = ['#7c3aed', '#0ea5e9', '#f97316', '#10b981', '#ec4899', '#eab308'];
const mapChartValue = (value: number, axis: ChartAxis, extent: number): number => axis.max === axis.min ? 0 : (value - axis.min) / (axis.max - axis.min) * extent;
function chartTicks(axis: ChartAxis): number[] {
  if (!(axis.step > 0)) return axis.min === axis.max ? [axis.min] : [axis.min, axis.max];
  const ticks: number[] = [];
  for (let value = axis.min; value <= axis.max + 1e-9 && ticks.length < 1000; value += axis.step) ticks.push(Math.round(value * 1000) / 1000);
  return ticks;
}

function chartText(id: string, order: number, bounds: Bounds, x: number, y: number, width: number, height: number, text: string, chart: Chart, align: 'left' | 'center' | 'right' = 'left', rotation?: number): SceneText {
  return { type: 'text', id, order, bounds, x, y, width, height, lines: [text], fontFamily: chart.font_family ?? DEFAULT_FONT, fontSize: Math.max(9, finite(chart.font_size, 12)), fontWeight: 'normal', color: chart.text_color ?? '#0f172a', align, verticalAlign: 'top', lineHeight: 1.2, rotation, rotationCenter: rotation ? { x, y } : undefined };
}

// Heatmap only, for now: value <-> color-band bucketing. Ported from
// stickyflow-atlas's entities/charts/ui/chartScale.ts (axisBands/
// bandIndexForValue/contrastTextColor) rather than shared via an import -
// this package has no equivalent cross-package boundary to atlas, and these
// are small enough that duplicating them beats depending on Atlas's app code.
const DEFAULT_ZONE_FILL = '#94a3b8';
const DEFAULT_HEATMAP_ZONES: ChartZone[] = [
  { label: 'Low', color: '#ddd6fe' },
  { label: 'Medium', color: '#a78bfa' },
  { label: 'High', color: '#6d28d9' },
];
const DEFAULT_HEX_RADIUS = 14;

/** Sorted band boundaries axis_y.thresholds splits the value range into,
 *  including min/max as the outer edges - N in-range thresholds produce N+1
 *  bands. Out-of-range thresholds are dropped rather than clamped, so a
 *  mistaken threshold outside [min, max] can't silently collapse a band to
 *  zero width. */
function axisBands(axis: ChartAxis): number[] {
  const thresholds = [...(axis.thresholds ?? [])].filter(t => t > axis.min && t < axis.max).sort((a, b) => a - b);
  return [axis.min, ...thresholds, axis.max];
}

/** Index of the band (from axisBands) a value falls into - values outside
 *  [min, max] clamp into the outermost band. */
function bandIndexForValue(value: number, bands: number[]): number {
  for (let i = 0; i < bands.length - 2; i++) if (value < bands[i + 1]) return i;
  return Math.max(0, bands.length - 2);
}

/** Black or white, whichever reads better on top of the given hex fill - used
 *  where a label sits directly on a data-driven color (a heatmap cell)
 *  instead of the chart's fixed text_color. */
/** Linear-interpolation percentile ("type 7", R/numpy/ggplot2's default) -
 *  `sorted` must already be ascending. Boxplot only. */
function quantile(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const h = (n - 1) * p, lo = Math.floor(h), hi = Math.ceil(h);
  return lo === hi ? sorted[lo] : sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

interface BoxplotStats { min: number; q1: number; median: number; q3: number; max: number; }

/** Five-number summary of a category's raw sample values - null for an empty
 *  series. Whiskers are the true min/max of the sample, not an IQR-based
 *  outlier cutoff - matches what's actually shown (every raw value as its own
 *  jittered point). */
function computeBoxplotStats(values: number[]): BoxplotStats | null {
  if (!values?.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return { min: sorted[0], q1: quantile(sorted, .25), median: quantile(sorted, .5), q3: quantile(sorted, .75), max: sorted[sorted.length - 1] };
}

function contrastTextColor(hex: string | undefined): string {
  if (!hex || hex[0] !== '#') return '#0f172a';
  const digits = hex.length === 4 ? hex.slice(1).split('').map(c => parseInt(c + c, 16)) : [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const [r, g, b] = digits;
  if ([r, g, b].some(c => Number.isNaN(c))) return '#0f172a';
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#0f172a' : '#ffffff';
}

// SFL 1.4, §5.4.5: a series' raw error entry (symmetric number or asymmetric
// [low, high] pair) resolved against its point's own value into an absolute
// [low, high] range on the value axis.
function errorBarRange(value: number, error: number | [number, number]): [number, number] {
  return Array.isArray(error) ? [value - error[0], value + error[1]] : [value - error, value + error];
}

const ERROR_CAP_HALF = 5;

// One whisker (main line + two end caps), centered on a fixed pixel position
// `center` along the category axis (always X - this package's bar chart has
// no horizontal-orientation flag), between two Y pixel positions.
// Carries the same series/index as the mark it annotates: a whisker is drawn
// over its own bar's top edge, so without it the one spot a reader would
// grab to change that value is covered by something that isn't the value.
function errorWhiskerNode(id: string, order: number, bounds: Bounds, center: number, y1: number, y2: number, color: string, series?: string, valueIndex?: number): RenderNode {
  const d = `M ${center} ${y1} L ${center} ${y2} M ${center - ERROR_CAP_HALF} ${y1} L ${center + ERROR_CAP_HALF} ${y1} M ${center - ERROR_CAP_HALF} ${y2} L ${center + ERROR_CAP_HALF} ${y2}`;
  return { type: 'path', id, order, bounds, d, sfSeries: series, sfValueIndex: valueIndex, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color }, strokeWidth: 1 } };
}

// SFL 1.4, §5.4.1: cumulative per-category segment [pixelStart, pixelEnd]
// (in plot-height pixel terms, 0 = axis_y.min) for one series at one
// category - 'waterfall' runs each series independently (its own floating
// baseline); 'true'/'percent' combine all series at a category.
function stackedSegment(chart: Chart, mode: 'true' | 'percent' | 'waterfall', categoryIndex: number, seriesIndex: number, plotHeight: number): { value: number; pixelStart: number; pixelEnd: number } {
  const value = (chart.series[seriesIndex].values as number[])[categoryIndex] ?? 0;
  if (mode === 'waterfall') {
    let running = 0;
    for (let i = 0; i < categoryIndex; i++) running += (chart.series[seriesIndex].values as number[])[i] ?? 0;
    return { value, pixelStart: mapChartValue(running, chart.axis_y, plotHeight), pixelEnd: mapChartValue(running + value, chart.axis_y, plotHeight) };
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
  return { value, pixelStart: mapChartValue(cum, chart.axis_y, plotHeight), pixelEnd: mapChartValue(cum + value, chart.axis_y, plotHeight) };
}

// SFL 1.4, §5.4.8: reference lines (`Rule`) - a second addressable leaf
// alongside Series, drawn on top of the chart's marks. Always axis_y (the
// value axis), full line across the plot - `presentation: bullet`'s short
// target-tick variant doesn't exist in this package (no `presentation`
// config at all yet).
// Types whose axis_y maps linearly to a y pixel, so a mark's height IS its
// value — the ones a value-drag gesture can meaningfully address. Excludes
// heatmap (buckets into threshold bands), pie/treemap/mekko/sankey/matrix
// (no y axis of their own at all).
const CARTESIAN_VALUE_TYPES = new Set(['bar', 'line', 'scatter', 'boxplot', 'hexbin', 'custom', 'grid', 'field']);

function buildChartRules(chart: Chart, plot: { x: number; y: number; width: number; height: number }, bounds: Bounds, order: number): RenderNode[] {
  const rules = chart.rules;
  if (!rules?.length) return [];
  const nodes: RenderNode[] = [];
  let offset = 0;
  const fontSize = Math.max(9, finite(chart.font_size, 12) - 2);
  rules.forEach(rule => {
    const color = rule.color || chart.stroke_color || '#475569';
    const y = plot.y + plot.height - mapChartValue(rule.at, chart.axis_y, plot.height);
    nodes.push({ type: 'path', id: `chart-rule-${chart.id}-${rule.id}`, order: order + offset++, bounds, d: `M ${plot.x} ${y} L ${plot.x + plot.width} ${y}`, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color }, strokeWidth: rule.stroke_width ?? 1, dash: rule.dash } });
    if (rule.text) nodes.push({ ...chartText(`chart-rule-label-${chart.id}-${rule.id}`, order + offset++, bounds, plot.x + 4, y - fontSize - 2, 160, fontSize + 2, rule.text, chart), color });
  });
  return nodes;
}

export function buildChart(chart: Chart, index: number, diagnostics: RenderDiagnostic[]): RenderNode[] {
  if (chart.is_visible === false) return [];
  // An unrecognised `type:` used to fall straight through to the generic
  // series path below, which draws a point per value — so a `type: heatmap`
  // came out as a scatter plot: plausible-looking, silently wrong, and with
  // nothing in diagnostics to say so. Still rendered (a rough plot beats a
  // blank box), but no longer silently: the caller can now surface it.
  if (!CHART_TYPES.includes(chart.chart_type)) {
    diagnostics.push({
      severity: 'warning', code: 'unsupported-chart-type', entityId: chart.id,
      message: `Unsupported chart type '${chart.chart_type}' — drawn as a plain series plot. Supported: ${CHART_TYPES.join(', ')}.`,
    });
  }
  const order = orderOf(chart, 20_000 + index), bounds = boxBounds(chart.x, chart.y, chart.width, chart.height, finite(chart.stroke_width, 1) + 2);
  const showLabels = chart.show_axis_labels !== false, showLegend = chart.show_legend !== false;
  const padLeft = showLabels ? (chart.axis_y.label ? 60 : 46) : 12;
  const basePadBottom = showLabels ? (chart.axis_x.label ? 52 : 34) : 12;
  // Fields §3.4: colorbar legend band, stacked below the normal x-axis tick
  // space - mirrors stickyflow-atlas's own chartLayout.ts reservation.
  const padBottom = chart.chart_type === 'field' && showLegend && chart.config?.scale?.stops.length ? basePadBottom + 34 : basePadBottom;
  const padTop = chart.title || (showLegend && chart.series.length) ? 44 : 24;
  const plot = { x: chart.x + padLeft, y: chart.y + padTop, width: Math.max(1, chart.width - padLeft - 24), height: Math.max(1, chart.height - padTop - padBottom) };
  const nodes: RenderNode[] = [{ type: 'rect', id: `chart-${chart.id}`, order, bounds, x: chart.x, y: chart.y, width: chart.width, height: chart.height, rx: chart.corner_radius ?? 12, style: { fill: { kind: 'solid', color: chart.fill_color ?? '#ffffff' }, stroke: { kind: 'solid', color: chart.stroke_color ?? '#475569' }, strokeWidth: finite(chart.stroke_width, 1) } }];
  if (CARTESIAN_VALUE_TYPES.has(chart.chart_type)) {
    nodes[0].sfValueScale = `${plot.y},${plot.height},${chart.axis_y.min},${chart.axis_y.max}`;
  }
  let offset = .01;
  if (chart.title) nodes.push({ ...chartText(`chart-title-${chart.id}`, order + offset++, bounds, plot.x, chart.y + 12, plot.width, 20, chart.title, chart), fontWeight: 'bold', fontSize: Math.max(10, finite(chart.font_size, 12)) + 2 });
  // Heatmap's own zone/threshold legend (drawn inside its own branch below)
  // replaces this one entirely : chart.series there is data rows, not
  // color-coded legend entries, so drawing per-series swatches from
  // CHART_COLORS would show a palette that has nothing to do with the
  // heatmap's actual cell colors.
  if (showLegend && chart.chart_type !== 'heatmap' && chart.chart_type !== 'boxplot' && chart.chart_type !== 'sankey' && chart.chart_type !== 'treemap' && chart.chart_type !== 'mekko' && chart.chart_type !== 'matrix') {
    let x = plot.x + plot.width;
    // Fields §3.4: a scalar series' own color is meaningless (the ramp
    // explains the surface, not the swatch) - its colorbar covers that
    // below instead. A vector series' color IS the arrow color though.
    const legendSeries = chart.chart_type === 'field'
      ? chart.series.filter(series => (series.values[0] as number[] | undefined)?.length === 4)
      : chart.series;
    [...legendSeries].reverse().forEach((series, reverseIndex) => {
      const seriesIndex = legendSeries.length - 1 - reverseIndex, width = Math.max(42, series.label.length * finite(chart.font_size, 12) * .58 + 22);
      x -= width;
      nodes.push({ type: 'rect', id: `chart-legend-swatch-${chart.id}-${series.id}`, order: order + offset++, bounds, x, y: chart.y + 16, width: 10, height: 10, rx: 3, style: { fill: paint(series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length], diagnostics, chart.id) } });
      nodes.push(chartText(`chart-legend-${chart.id}-${series.id}`, order + offset++, bounds, x + 15, chart.y + 13, width - 15, 18, series.label, chart));
    });
  }
  if (chart.chart_type === 'radar' || chart.chart_type === 'radial') {
    const circular = chart.chart_type === 'radial';
    const areaOpacity = Math.max(0, Math.min(1, chart.config?.areaOpacity ?? .16));
    const configured = chart.config?.categories?.filter(Boolean) ?? [];
    const dataCount = Math.max(0, ...chart.series.map(series => series.values.length));
    const categoryCount = Math.max(3, configured.length || dataCount);
    const defaults = ['Speed', 'Quality', 'Cost', 'Reliability', 'Usability'];
    const categories = Array.from({ length: categoryCount }, (_, categoryIndex) => configured[categoryIndex] ?? defaults[categoryIndex] ?? `Category ${categoryIndex + 1}`);
    const cx = plot.x + plot.width / 2, cy = plot.y + plot.height / 2;
    const labelSpace = Math.max(38, finite(chart.font_size, 12) * 3.2);
    const radius = Math.max(8, Math.min(plot.width, plot.height) / 2 - labelSpace);
    const range = chart.axis_y.max - chart.axis_y.min;
    const radial = (value: number) => (range === 0 ? 0 : Math.max(0, Math.min(1, (value - chart.axis_y.min) / range))) * radius;
    const point = (pointRadius: number, pointIndex: number) => {
      const angle = -Math.PI / 2 + pointIndex * Math.PI * 2 / categoryCount;
      return { x: cx + Math.cos(angle) * pointRadius, y: cy + Math.sin(angle) * pointRadius };
    };
    const polygon = (pointRadius: number) => `M ${Array.from({ length: categoryCount }, (_, pointIndex) => { const p = point(pointRadius, pointIndex); return `${pointIndex ? 'L ' : ''}${p.x} ${p.y}`; }).join(' ')} Z`;
    if (chart.show_grid !== false) {
      chartTicks(chart.axis_y).filter(tick => tick > chart.axis_y.min).forEach(tick => {
        const ringRadius = radial(tick);
        nodes.push(circular
          ? { type: 'ellipse', id: `chart-radial-ring-${chart.id}-${tick}`, order: order + offset++, bounds, cx, cy, rx: ringRadius, ry: ringRadius, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } }
          : { type: 'path', id: `chart-radar-ring-${chart.id}-${tick}`, order: order + offset++, bounds, d: polygon(ringRadius), style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } });
      });
      categories.forEach((_, categoryIndex) => { const edge = point(radius, categoryIndex); nodes.push({ type: 'path', id: `chart-radar-spoke-${chart.id}-${categoryIndex}`, order: order + offset++, bounds, d: `M ${cx} ${cy} L ${edge.x} ${edge.y}`, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } }); });
    }
    if (showLabels) categories.forEach((category, categoryIndex) => {
      const labelPoint = point(radius + 10, categoryIndex), dx = labelPoint.x - cx, width = Math.max(64, Math.min(120, plot.width / 3));
      nodes.push(chartText(`chart-radar-label-${chart.id}-${categoryIndex}`, order + offset++, bounds, labelPoint.x - (dx > 8 ? 0 : dx < -8 ? width : width / 2), labelPoint.y - 6, width, 30, category, chart, dx > 8 ? 'left' : dx < -8 ? 'right' : 'center'));
    });
    chart.series.forEach((series, seriesIndex) => {
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length], values = series.values as number[];
      const seriesPoints = categories.map((_, categoryIndex) => point(radial(values[categoryIndex] ?? chart.axis_y.min), categoryIndex));
      const seriesPath = circular ? freeformPathData(seriesPoints, .5, true) : `M ${seriesPoints.map((seriesPoint, pointIndex) => `${pointIndex ? 'L ' : ''}${seriesPoint.x} ${seriesPoint.y}`).join(' ')} Z`;
      nodes.push({ type: 'path', id: `chart-radar-fill-${chart.id}-${series.id}`, order: order + offset++, bounds, d: seriesPath, style: { fill: paint(color, diagnostics, chart.id), stroke: { kind: 'none' }, opacity: Math.max(0, Math.min(1, series.opacity ?? areaOpacity)) } });
      nodes.push({ type: 'path', id: `chart-radar-series-${chart.id}-${series.id}`, order: order + offset++, bounds, d: seriesPath, style: { fill: { kind: 'none' }, stroke: paint(color, diagnostics, chart.id), strokeWidth: 2, lineJoin: 'round' } });
      seriesPoints.forEach((seriesPoint, pointIndex) => nodes.push({ type: 'ellipse', id: `chart-radar-point-${chart.id}-${series.id}-${pointIndex}`, order: order + offset++, bounds, cx: seriesPoint.x, cy: seriesPoint.y, rx: 3, ry: 3, style: { fill: paint(color, diagnostics, chart.id) } }));
    });
    return nodes;
  }
  // Heatmap has no numeric axis to tick - it draws its own cell borders
  // inside its own branch below.
  if (chart.show_grid !== false && chart.chart_type !== 'heatmap' && chart.chart_type !== 'sankey' && chart.chart_type !== 'treemap' && chart.chart_type !== 'mekko' && chart.chart_type !== 'pie' && chart.chart_type !== 'matrix') {
    const gridStyle: SceneStyle = { fill: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' } }, gridWidth = finite(chart.grid_width, 1);
    chartTicks(chart.axis_x).forEach(tick => { const x = plot.x + mapChartValue(tick, chart.axis_x, plot.width); nodes.push({ type: 'rect', id: `chart-grid-x-${chart.id}-${tick}`, order: order + offset++, bounds, x: x - gridWidth / 2, y: plot.y, width: gridWidth, height: plot.height, style: gridStyle }); });
    chartTicks(chart.axis_y).forEach(tick => { const y = plot.y + plot.height - mapChartValue(tick, chart.axis_y, plot.height); nodes.push({ type: 'rect', id: `chart-grid-y-${chart.id}-${tick}`, order: order + offset++, bounds, x: plot.x, y: y - gridWidth / 2, width: plot.width, height: gridWidth, style: gridStyle }); });
  }
  // SFL 1.4, §5.4.1: bar-only. sflToCanvasState already normalizes 'none' to
  // undefined, but the Chart type itself still allows 'none' (a hand-built
  // RenderInput, bypassing the SFL pipeline, could set it explicitly).
  const stackedMode = chart.config?.stacked && chart.config.stacked !== 'none' ? chart.config.stacked : undefined;
  if (chart.chart_type === 'field') {
    // Fields §3.4: this export renderer is vector-only (no raster/canvas
    // access, see SceneImage's own comment above) - the color surface is a
    // grid of solid-color rects instead of a canvas raster, sharing the
    // same computeFieldGrid/colorAtRamp math as the live editor either way.
    const power = chart.config?.idwPower ?? 2;
    const scalarSamples: FieldSample[] = chart.series
      .filter(series => (series.values[0] as number[] | undefined)?.length === 3)
      .flatMap(series => (series.values as [number, number, number][]).map(([vx, vy, value]) => ({
        x: mapChartValue(vx, chart.axis_x, plot.width),
        y: plot.height - mapChartValue(vy, chart.axis_y, plot.height),
        value,
      })));
    const vectorSeriesList = chart.series.filter(series => (series.values[0] as number[] | undefined)?.length === 4);

    if (scalarSamples.length && plot.width > 0 && plot.height > 0) {
      const { grid, cols, rows } = computeFieldGrid(scalarSamples, plot.width, plot.height, power);
      const cellW = plot.width / Math.max(1, cols - 1), cellH = plot.height / Math.max(1, rows - 1);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = plot.x + plot.width * (col / (cols - 1));
          const cy = plot.y + plot.height * (row / (rows - 1));
          const color = colorAtRamp(chart.config?.scale, grid[row * cols + col]);
          nodes.push({
            type: 'rect', id: `chart-field-cell-${chart.id}-${row}-${col}`, order: order + offset++, bounds,
            x: cx - cellW / 2, y: cy - cellH / 2, width: cellW, height: cellH,
            style: { fill: { kind: 'solid', color } },
          });
        }
      }
      (chart.config?.isolines ?? []).forEach((threshold, ti) => {
        const segments = computeIsolineSegments(grid, cols, rows, plot.width, plot.height, threshold);
        if (!segments.length) return;
        const d = segments.map(seg => `M ${plot.x + seg.x1} ${plot.y + seg.y1} L ${plot.x + seg.x2} ${plot.y + seg.y2}`).join(' ');
        nodes.push({
          type: 'path', id: `chart-field-isoline-${chart.id}-${ti}`, order: order + offset++, bounds, d,
          style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: 'rgba(15, 23, 42, 0.55)' }, strokeWidth: 1 },
        });
      });
    }

    vectorSeriesList.forEach((series, seriesIndex) => {
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      (series.values as [number, number, number, number][]).forEach(([vx, vy, angle, magnitude], i) => {
        const startX = plot.x + mapChartValue(vx, chart.axis_x, plot.width);
        const startY = plot.y + plot.height - mapChartValue(vy, chart.axis_y, plot.height);
        const endX = plot.x + mapChartValue(vx + Math.cos(angle) * magnitude, chart.axis_x, plot.width);
        const endY = plot.y + plot.height - mapChartValue(vy + Math.sin(angle) * magnitude, chart.axis_y, plot.height);
        nodes.push({
          type: 'path', id: `chart-field-vector-${chart.id}-${series.id}-${i}`, order: order + offset++, bounds,
          d: `M ${startX} ${startY} L ${endX} ${endY}`, markerEnd: 'filled_arrow',
          style: { fill: { kind: 'none' }, stroke: paint(color, diagnostics, chart.id), strokeWidth: 2 },
        });
      });
    });

    // Colorbar legend - min/max labels use the ramp's own stop range, not
    // the axis range (the ramp's span defines the field's meaningful value
    // range - see field.ts).
    if (showLegend && chart.config?.scale?.stops.length) {
      const rampStops = [...chart.config.scale.stops].sort((a, b) => a.position - b.position);
      const min = rampStops[0].position, max = rampStops[rampStops.length - 1].position, span = max - min;
      const barWidth = Math.min(220, plot.width), barX = plot.x + (plot.width - barWidth) / 2, barY = plot.y + plot.height + 46, barHeight = 8;
      nodes.push({
        type: 'rect', id: `chart-field-colorbar-${chart.id}`, order: order + offset++, bounds,
        x: barX, y: barY, width: barWidth, height: barHeight, rx: 2,
        style: { fill: { kind: 'linear-gradient', angle: 0, stops: rampStops.map(s => ({ offset: span === 0 ? 0 : (s.position - min) / span * 100, color: s.color })) } },
      });
      nodes.push(chartText(`chart-field-colorbar-min-${chart.id}`, order + offset++, bounds, barX, barY + barHeight + 3, 80, 16, formatFieldValue(min), chart));
      nodes.push(chartText(`chart-field-colorbar-max-${chart.id}`, order + offset++, bounds, barX + barWidth - 80, barY + barHeight + 3, 80, 16, formatFieldValue(max), chart, 'right'));
    }
  } else if (chart.chart_type === 'heatmap') {
    // Grid heatmap: config.categories are column headers, each series is one
    // row (series.label is the row header, series.values one plain number per
    // column). A cell's color comes from bucketing its value into one of
    // axis_y's `thresholds` bands and looking up config.zones' ascending
    // low->high color for that band.
    const rows = chart.series;
    const columns = chart.config?.categories?.length ? chart.config.categories : ((rows[0]?.values as number[] | undefined)?.map((_, i) => String(i + 1)) ?? []);
    const bandsArr = axisBands(chart.axis_y);
    const zones = chart.config?.zones?.length ? chart.config.zones : DEFAULT_HEATMAP_ZONES;
    const heatmapFontSize = Math.max(9, finite(chart.font_size, 12));
    const rowHeaderWidth = showLabels ? Math.min(96, Math.max(0, plot.width * .3)) : 0;
    const colHeaderHeight = showLabels ? 24 : 0;
    const legendHeight = showLegend ? 22 : 0;
    const gridX = plot.x + rowHeaderWidth, gridY = plot.y + colHeaderHeight;
    const gridWidth = Math.max(1, plot.width - rowHeaderWidth);
    const gridHeight = Math.max(1, plot.height - colHeaderHeight - legendHeight);
    const cellW = columns.length ? gridWidth / columns.length : gridWidth;
    const cellH = rows.length ? gridHeight / rows.length : gridHeight;

    rows.forEach((series, rowIndex) => {
      const values = series.values as number[];
      const y = gridY + rowIndex * cellH;
      columns.forEach((_, colIndex) => {
        const value = values[colIndex] ?? 0;
        const color = zones[bandIndexForValue(value, bandsArr)]?.color ?? DEFAULT_ZONE_FILL;
        const x = gridX + colIndex * cellW;
        nodes.push({ type: 'rect', id: `chart-heatmap-cell-${chart.id}-${series.id}-${colIndex}`, order: order + offset++, bounds, x, y, width: cellW, height: cellH, style: { fill: { kind: 'solid', color }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } });
        nodes.push({ ...chartText(`chart-heatmap-value-${chart.id}-${series.id}-${colIndex}`, order + offset++, bounds, x, y + cellH / 2 - heatmapFontSize / 2, cellW, heatmapFontSize + 2, String(value), chart, 'center'), color: contrastTextColor(color) });
      });
    });
    if (rowHeaderWidth > 0) rows.forEach((series, rowIndex) => {
      nodes.push(chartText(`chart-heatmap-row-${chart.id}-${series.id}`, order + offset++, bounds, plot.x, gridY + rowIndex * cellH + cellH / 2 - heatmapFontSize / 2, rowHeaderWidth - 8, heatmapFontSize + 2, series.label, chart));
    });
    if (colHeaderHeight > 0) columns.forEach((label, colIndex) => {
      nodes.push(chartText(`chart-heatmap-col-${chart.id}-${colIndex}`, order + offset++, bounds, gridX + colIndex * cellW, plot.y, cellW, heatmapFontSize + 2, label, chart, 'center'));
    });
    if (legendHeight > 0) {
      const legendItemWidths = zones.map(zone => Math.max(64, (zone.label?.length ?? 0) * (heatmapFontSize - 1) * .55 + 40));
      let legendX = gridX;
      const legendY = gridY + gridHeight + 6;
      zones.forEach((zone, i) => {
        const [lo, hi] = [bandsArr[i], bandsArr[i + 1]];
        const swatchColor = zone.color ?? DEFAULT_ZONE_FILL;
        nodes.push({ type: 'rect', id: `chart-heatmap-legend-swatch-${chart.id}-${i}`, order: order + offset++, bounds, x: legendX, y: legendY + 2, width: 10, height: 10, rx: 2, style: { fill: { kind: 'solid', color: swatchColor } } });
        nodes.push(chartText(`chart-heatmap-legend-${chart.id}-${i}`, order + offset++, bounds, legendX + 15, legendY, legendItemWidths[i] - 15, heatmapFontSize, zone.label ? `${zone.label} (${lo}-${hi})` : `${lo}-${hi}`, chart));
        legendX += legendItemWidths[i];
      });
    }
  } else if (chart.chart_type === 'sankey') {
    // config.zones IS the node list here (label = node id/display name, color
    // = that node's fill) - not a value-color legend like heatmap. Each
    // series is a flow between two nodes (series.source/target reference
    // zone labels), values[0] its magnitude.
    const sankeyFontSize = Math.max(9, finite(chart.font_size, 12));
    const labelGutter = showLabels ? 92 : 0;
    const nodeInputs = (chart.config?.zones ?? []).map(zone => ({ id: zone.label, label: zone.label, color: zone.color }));
    // layoutSankey's graph layout only ever carries color as opaque string
    // data (same reason ChartZone.color - node color - is string-only too) :
    // a gradient series still tints its flow with a representative solid
    // (its first stop), rather than the layout module needing to understand
    // ScenePaint at all.
    const linkInputs = chart.series
      .filter(series => series.source && series.target)
      .map(series => ({ source: series.source!, target: series.target!, value: (series.values as number[])[0] ?? 0, color: series.color ? representativeColor(series.color, DEFAULT_ZONE_FILL) : undefined }));
    const availableWidth = Math.max(1, plot.width - labelGutter * 2);
    const originX = labelGutter;
    const { nodes: sankeyNodes, links } = layoutSankey(nodeInputs, linkInputs, availableWidth, plot.height);
    const numColumns = Math.max(1, ...sankeyNodes.map(n => n.column + 1));
    const colorOf = (id: string) => sankeyNodes.find(n => n.id === id)?.color || DEFAULT_ZONE_FILL;
    const baseX = plot.x + originX, baseY = plot.y;

    links.forEach((link, linkIndex) => {
      const x0 = baseX + link.x0, x1 = baseX + link.x1;
      const y0Top = baseY + link.sourceY0, y0Bottom = baseY + link.sourceY1;
      const y1Top = baseY + link.targetY0, y1Bottom = baseY + link.targetY1;
      const midX = (x0 + x1) / 2;
      const d = `M ${x0} ${y0Top} C ${midX} ${y0Top} ${midX} ${y1Top} ${x1} ${y1Top} L ${x1} ${y1Bottom} C ${midX} ${y1Bottom} ${midX} ${y0Bottom} ${x0} ${y0Bottom} Z`;
      const color = link.color || colorOf(link.target);
      nodes.push({ type: 'path', id: `chart-sankey-link-${chart.id}-${linkIndex}`, order: order + offset++, bounds, d, style: { fill: { kind: 'solid', color }, opacity: link.color ? .85 : .45 } });
    });
    sankeyNodes.forEach(node => {
      const isLastColumn = node.column === numColumns - 1;
      const x = baseX + node.x, y = baseY + node.y;
      nodes.push({ type: 'rect', id: `chart-sankey-node-${chart.id}-${node.id}`, order: order + offset++, bounds, x, y, width: node.width, height: node.height, style: { fill: { kind: 'solid', color: node.color || DEFAULT_ZONE_FILL } } });
      if (showLabels) {
        const labelX = isLastColumn ? x - labelGutter + 8 : x + node.width + 6;
        nodes.push({
          ...chartText(`chart-sankey-label-${chart.id}-${node.id}`, order + offset++, bounds, labelX, y, labelGutter - 12, Math.max(1, node.height), node.label, chart, isLastColumn ? 'right' : 'left'),
          fontSize: sankeyFontSize - 2, verticalAlign: 'middle',
        });
      }
    });
  } else if (chart.chart_type === 'mekko') {
    // Marimekko: columns are config.categories, each series is one ROW
    // stacked (100%-style) inside every column. Column WIDTH is always
    // proportional to that column's total across all rows - Mekko's
    // defining trait. Column HEIGHT is uniform unless mekkoVaryHeight, in
    // which case it's proportional to the column's share of the largest
    // column's total too.
    const mekkoRows = chart.series;
    const mekkoColumns = chart.config?.categories?.length ? chart.config.categories : ((mekkoRows[0]?.values as number[] | undefined)?.map((_, i) => String(i + 1)) ?? []);
    const mekkoFontSize = Math.max(9, finite(chart.font_size, 12));
    const mekkoSmallFontSize = Math.max(8, mekkoFontSize - 1);
    const varyHeight = chart.config?.mekkoVaryHeight ?? false;
    const COLUMN_GAP = 4;
    const PERCENT_TICKS = [0, 25, 50, 75, 100];
    const leftGutter = showLabels ? 30 : 0, topGutter = showLabels ? 18 : 0, bottomGutter = showLabels ? 32 : 0;
    const mekkoGridX = plot.x + leftGutter, mekkoGridY = plot.y + topGutter;
    const mekkoGridWidth = Math.max(1, plot.width - leftGutter);
    const mekkoGridHeight = Math.max(1, plot.height - topGutter - bottomGutter);
    const columnTotals = mekkoColumns.map((_, colIndex) => mekkoRows.reduce((sum, series) => sum + ((series.values as number[])[colIndex] ?? 0), 0));
    const grandTotal = columnTotals.reduce((sum, total) => sum + total, 0);
    const maxColumnTotal = Math.max(1, ...columnTotals);
    const gapWidth = COLUMN_GAP * Math.max(0, mekkoColumns.length - 1);
    const availableWidth = Math.max(1, mekkoGridWidth - gapWidth);
    const columnWidths = columnTotals.map(total => grandTotal > 0 ? (total / grandTotal) * availableWidth : availableWidth / mekkoColumns.length);
    const columnX = columnWidths.reduce<number[]>((acc, width, i) => { acc.push(i === 0 ? mekkoGridX : acc[i - 1] + columnWidths[i - 1] + COLUMN_GAP); return acc; }, []);
    const columnHeights = columnTotals.map(total => varyHeight ? mekkoGridHeight * (total / maxColumnTotal) : mekkoGridHeight);
    const columnY = columnHeights.map(height => mekkoGridY + (mekkoGridHeight - height));

    if (chart.show_grid !== false) PERCENT_TICKS.forEach(p => {
      const y = mekkoGridY + mekkoGridHeight * (1 - p / 100);
      nodes.push({ type: 'path', id: `chart-mekko-grid-${chart.id}-${p}`, order: order + offset++, bounds, d: `M ${mekkoGridX} ${y} L ${mekkoGridX + mekkoGridWidth} ${y}`, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } });
    });
    if (showLabels) PERCENT_TICKS.forEach(p => {
      const y = mekkoGridY + mekkoGridHeight * (1 - p / 100);
      nodes.push({ ...chartText(`chart-mekko-pct-${chart.id}-${p}`, order + offset++, bounds, plot.x, y - mekkoSmallFontSize / 2, leftGutter - 6, mekkoSmallFontSize + 2, `${p}%`, chart, 'right'), fontSize: mekkoSmallFontSize });
    });
    mekkoColumns.forEach((label, colIndex) => {
      const x = columnX[colIndex], width = columnWidths[colIndex], total = columnTotals[colIndex];
      let cumulative = 0;
      mekkoRows.forEach((series, rowIndex) => {
        const value = (series.values as number[])[colIndex] ?? 0;
        const share = total > 0 ? value / total : 0;
        const height = share * columnHeights[colIndex];
        const y = columnY[colIndex] + cumulative;
        cumulative += height;
        const color = series.color ?? CHART_COLORS[rowIndex % CHART_COLORS.length];
        nodes.push({ type: 'rect', id: `chart-mekko-seg-${chart.id}-${colIndex}-${series.id}`, order: order + offset++, bounds, x, y, width, height, style: { fill: paint(color, diagnostics, chart.id), stroke: { kind: 'solid', color: '#ffffff' }, strokeWidth: 1 } });
        if (showLegend && height >= 16 && width >= 34) {
          nodes.push({
            ...chartText(`chart-mekko-seg-label-${chart.id}-${colIndex}-${series.id}`, order + offset++, bounds, x + 4, y + 3, Math.max(1, width - 8), Math.max(1, height - 6), `${series.label} ${value}`, chart),
            lines: wrapText(`${series.label}\n${value}`, Math.max(1, width - 8), mekkoSmallFontSize), fontSize: mekkoSmallFontSize, color: contrastTextColor(representativeColor(color, '#ffffff')),
          });
        }
      });
      if (showLabels) {
        nodes.push({ ...chartText(`chart-mekko-total-${chart.id}-${colIndex}`, order + offset++, bounds, x, plot.y, width, mekkoSmallFontSize + 2, String(total), chart, 'center'), fontSize: mekkoSmallFontSize });
        nodes.push({
          ...chartText(`chart-mekko-col-label-${chart.id}-${colIndex}`, order + offset++, bounds, x, mekkoGridY + mekkoGridHeight + 4, width, mekkoSmallFontSize * 2 + 4, label, chart, 'center'),
          lines: wrapText(label, width, mekkoSmallFontSize), fontSize: mekkoSmallFontSize,
        });
      }
    });
  } else if (chart.chart_type === 'treemap') {
    // Each series IS one leaf tile, sized proportionally to values[0] via the
    // squarified algorithm, colored either by its own series.color or (like
    // heatmap) bucketed by value into axis_y.thresholds/config.zones. Flat
    // only for now - stickyflow-atlas's grouped/nested variant (series.group)
    // isn't ported yet.
    const leaves = chart.series;
    const bandsArr = axisBands(chart.axis_y);
    const zones = chart.config?.zones?.length ? chart.config.zones : DEFAULT_HEATMAP_ZONES;
    const treemapFontSize = Math.max(9, finite(chart.font_size, 12));
    const smallFontSize = Math.max(8, treemapFontSize - 1);
    const leafValue = (leaf: typeof leaves[number]) => (leaf.values as number[])[0] ?? 0;
    const leafColor = (leaf: typeof leaves[number]) => leaf.color ?? zones[bandIndexForValue(leafValue(leaf), bandsArr)]?.color ?? DEFAULT_ZONE_FILL;
    const legendHeight = showLegend ? 28 : 0;
    const gridWidth = Math.max(1, plot.width), gridHeight = Math.max(1, plot.height - legendHeight);
    const leafItems = leaves.map(leaf => ({ leaf, value: leafValue(leaf) }));

    for (const tile of squarifyTreemap(leafItems, 0, 0, gridWidth, gridHeight)) {
      const { leaf, value } = tile.item;
      const x = plot.x + tile.x, y = plot.y + tile.y;
      const color = leafColor(leaf);
      nodes.push({ type: 'rect', id: `chart-treemap-tile-${chart.id}-${leaf.id}`, order: order + offset++, bounds, x, y, width: tile.width, height: tile.height, style: { fill: paint(color, diagnostics, chart.id), stroke: { kind: 'solid', color: '#ffffff' }, strokeWidth: 1 } });
      if (showLabels && tile.width >= 34 && tile.height >= 18) {
        nodes.push({
          ...chartText(`chart-treemap-label-${chart.id}-${leaf.id}`, order + offset++, bounds, x + 4, y + 3, Math.max(1, tile.width - 8), Math.max(1, tile.height - 6), `${leaf.label} ${value}`, chart),
          lines: wrapText(`${leaf.label}\n${value}`, Math.max(1, tile.width - 8), smallFontSize), fontSize: smallFontSize, color: contrastTextColor(representativeColor(color, '#ffffff')),
        });
      }
    }
    if (legendHeight > 0) {
      const legendItemWidths = zones.map(zone => Math.max(64, (zone.label?.length ?? 0) * (treemapFontSize - 1) * .55 + 40));
      let legendX = plot.x;
      const legendY = plot.y + gridHeight + 6;
      zones.forEach((zone, i) => {
        const [lo, hi] = [bandsArr[i], bandsArr[i + 1]];
        nodes.push({ type: 'rect', id: `chart-treemap-legend-swatch-${chart.id}-${i}`, order: order + offset++, bounds, x: legendX, y: legendY + 2, width: 10, height: 10, rx: 2, style: { fill: { kind: 'solid', color: zone.color ?? DEFAULT_ZONE_FILL } } });
        nodes.push(chartText(`chart-treemap-legend-${chart.id}-${i}`, order + offset++, bounds, legendX + 15, legendY, legendItemWidths[i] - 15, treemapFontSize, zone.label ? `${zone.label} (${lo}-${hi})` : `${lo}-${hi}`, chart));
        legendX += legendItemWidths[i];
      });
    }
  } else if (chart.chart_type === 'boxplot') {
    // Each series IS one box: min/q1/median/q3/max via computeBoxplotStats,
    // whiskers reach the true min/max, and (when showBoxplotPoints) every raw
    // value is its own deterministically-jittered dot (hashed from its index,
    // not Math.random, so re-rendering the same data doesn't reshuffle them).
    // Vertical only - this package's bar has no horizontal flag either.
    const boxCount = Math.max(1, chart.series.length);
    const boxWidthFraction = Math.min(1, Math.max(.05, chart.config?.boxWidth ?? .6));
    const boxCornerRadius = chart.config?.barCornerRadius ?? 2;
    const showPoints = chart.config?.showBoxplotPoints ?? true;
    const borderColor = chart.config?.barBorderColor || '#000000';
    const borderWidth = finite(chart.config?.barBorderWidth, 1);
    const jitter = (seed: number) => { const h = Math.sin(seed * 12.9898) * 43758.5453; return (h - Math.floor(h)) - .5; };
    const boxLine = (id: string, x1: number, y1: number, x2: number, y2: number, width: number): RenderNode =>
      ({ type: 'path', id, order: order + offset++, bounds, d: `M ${x1} ${y1} L ${x2} ${y2}`, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: borderColor }, strokeWidth: width } });
    const slotWidth = plot.width / boxCount, boxWidth = Math.max(4, slotWidth * boxWidthFraction);
    chart.series.forEach((series, seriesIndex) => {
      const stats = computeBoxplotStats(series.values as number[]);
      if (!stats) return;
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      const x = plot.x + seriesIndex * slotWidth + slotWidth / 2;
      const minY = plot.y + plot.height - mapChartValue(stats.min, chart.axis_y, plot.height);
      const q1Y = plot.y + plot.height - mapChartValue(stats.q1, chart.axis_y, plot.height);
      const medianY = plot.y + plot.height - mapChartValue(stats.median, chart.axis_y, plot.height);
      const q3Y = plot.y + plot.height - mapChartValue(stats.q3, chart.axis_y, plot.height);
      const maxY = plot.y + plot.height - mapChartValue(stats.max, chart.axis_y, plot.height);
      const capHalf = boxWidth * .2;
      const id = `${chart.id}-${series.id}`;
      nodes.push(boxLine(`chart-box-whisker-lo-${id}`, x, minY, x, q1Y, 1));
      nodes.push(boxLine(`chart-box-whisker-hi-${id}`, x, q3Y, x, maxY, 1));
      nodes.push(boxLine(`chart-box-cap-lo-${id}`, x - capHalf, minY, x + capHalf, minY, 1));
      nodes.push(boxLine(`chart-box-cap-hi-${id}`, x - capHalf, maxY, x + capHalf, maxY, 1));
      nodes.push({ type: 'rect', id: `chart-box-${id}`, order: order + offset++, bounds, x: x - boxWidth / 2, y: q3Y, width: boxWidth, height: Math.max(1, q1Y - q3Y), rx: boxCornerRadius, style: { fill: paint(color, diagnostics, chart.id), stroke: { kind: 'solid', color: borderColor }, strokeWidth: borderWidth } });
      nodes.push(boxLine(`chart-box-median-${id}`, x - boxWidth / 2, medianY, x + boxWidth / 2, medianY, 2));
      if (showPoints) (series.values as number[]).forEach((value, pi) => {
        nodes.push({ type: 'ellipse', id: `chart-box-point-${id}-${pi}`, order: order + offset++, bounds, cx: x + jitter(seriesIndex * 10_000 + pi) * boxWidth, cy: plot.y + plot.height - mapChartValue(value, chart.axis_y, plot.height), rx: 3, ry: 3, style: { fill: paint(color, diagnostics, chart.id), opacity: .7 } });
      });
    });
  } else if (chart.chart_type === 'hexbin') {
    // Density heatmap over a point cloud: each series' [x, y] samples are
    // mapped to plot pixels, bucketed into a flat-top hex grid (computeHexBins),
    // then drawn as filled hexagons whose opacity scales with that cell's
    // share of the series' densest cell. Uses the normal numeric x/y axes -
    // unlike heatmap/sankey/treemap/mekko it is NOT excluded from the generic
    // cartesian grid/tick-label blocks above.
    const hexRadius = Math.max(1, chart.config?.hexRadius ?? DEFAULT_HEX_RADIUS);
    const hexPath = (cx: number, cy: number, r: number) => {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (-60 + 60 * i) * Math.PI / 180;
        pts.push(`${i === 0 ? 'M' : 'L'} ${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)}`);
      }
      return `${pts.join(' ')} Z`;
    };
    chart.series.forEach((series, seriesIndex) => {
      const explicit = series.values.length > 0 && Array.isArray(series.values[0]);
      const pairs = explicit ? series.values as [number, number][] : (series.values as number[]).map((y, i) => [chart.axis_x.min + i * chart.axis_x.step, y] as [number, number]);
      const pixelPoints = pairs.map(([vx, vy]) => ({
        x: plot.x + mapChartValue(vx, chart.axis_x, plot.width),
        y: plot.y + plot.height - mapChartValue(vy, chart.axis_y, plot.height),
      }));
      const bins = computeHexBins(pixelPoints, hexRadius);
      const maxCount = Math.max(1, ...bins.map(bin => bin.count));
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      bins.forEach((bin, i) => {
        nodes.push({
          type: 'path', id: `chart-hexbin-${chart.id}-${series.id}-${i}`, order: order + offset++, bounds,
          d: hexPath(bin.cx, bin.cy, hexRadius),
          style: { fill: paint(color, diagnostics, chart.id), opacity: Math.max(.15, bin.count / maxCount) },
        });
      });
    });
  } else if (chart.chart_type === 'pie') {
    // Each series IS one slice, sized by values[0]'s share of the series
    // total - no axis_x/axis_y involvement at all, unlike every other chart
    // family. config.innerRadius > 0 punches a donut hole through the center.
    const total = chart.series.reduce((sum, series) => sum + Math.max(0, finite((series.values as number[])[0], 0)), 0) || 1;
    const cx = plot.x + plot.width / 2, cy = plot.y + plot.height / 2;
    const outerRadius = Math.max(1, Math.min(plot.width, plot.height) / 2 - 4);
    const innerRadius = Math.max(0, Math.min(chart.config?.innerRadius ?? 0, outerRadius - 1));
    const arcPoint = (angle: number, r: number) => ({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    let angle = -Math.PI / 2;
    chart.series.forEach((series, seriesIndex) => {
      const value = Math.max(0, finite((series.values as number[])[0], 0));
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      const sweep = value / total * Math.PI * 2;
      if (sweep <= 0) return;
      // A single 360° slice degenerates an SVG arc (identical start/end
      // point), so a full circle is drawn as a 359.999° arc instead.
      const endAngle = angle + Math.min(sweep, Math.PI * 2 * (359.999 / 360));
      const largeArc = endAngle - angle > Math.PI ? 1 : 0;
      const outerStart = arcPoint(angle, outerRadius), outerEnd = arcPoint(endAngle, outerRadius);
      const d = innerRadius > 0
        ? (() => {
          const innerEnd = arcPoint(endAngle, innerRadius), innerStart = arcPoint(angle, innerRadius);
          return `M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
        })()
        : `M ${cx} ${cy} L ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} Z`;
      nodes.push({ type: 'path', id: `chart-pie-slice-${chart.id}-${series.id}`, order: order + offset++, bounds, d, style: { fill: paint(color, diagnostics, chart.id) } });
      angle += sweep;
    });
  } else if (chart.chart_type === 'matrix') {
    // Two-axis quadrant chart: axis_x/axis_y thresholds each band their axis
    // into N+1 ranges (axisBands, same helper heatmap uses); config.zones
    // colors each resulting cell, indexed row-major with y ascending
    // (zones[yBand * xBandCount + xBand]) - purely a label/color backdrop,
    // optional. Every series is ONE point (values[0] = [x, y]), marker size
    // from that series' own `size`, not axis-driven like a bubble chart.
    const xBands = axisBands(chart.axis_x), yBands = axisBands(chart.axis_y);
    const xBandCount = xBands.length - 1, yBandCount = yBands.length - 1;
    const zones = chart.config?.zones ?? [];
    const xPixel = (value: number) => plot.x + mapChartValue(value, chart.axis_x, plot.width);
    const yPixel = (value: number) => plot.y + plot.height - mapChartValue(value, chart.axis_y, plot.height);
    if (zones.length) for (let yi = 0; yi < yBandCount; yi++) for (let xi = 0; xi < xBandCount; xi++) {
      const zone = zones[yi * xBandCount + xi];
      if (!zone) continue;
      const x1 = xPixel(xBands[xi]), x2 = xPixel(xBands[xi + 1]), y1 = yPixel(yBands[yi + 1]), y2 = yPixel(yBands[yi]);
      nodes.push({ type: 'rect', id: `chart-matrix-zone-${chart.id}-${xi}-${yi}`, order: order + offset++, bounds, x: x1, y: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1), style: { fill: { kind: 'solid', color: zone.color ?? DEFAULT_ZONE_FILL } } });
      if (zone.label) nodes.push({ ...chartText(`chart-matrix-zone-label-${chart.id}-${xi}-${yi}`, order + offset++, bounds, x1 + 6, y1 + 4, Math.max(0, x2 - x1) - 12, 16, zone.label, chart), color: contrastTextColor(zone.color) });
    }
    const gridStyle: SceneStyle = { fill: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' } };
    for (let xi = 1; xi < xBandCount; xi++) { const x = xPixel(xBands[xi]); nodes.push({ type: 'rect', id: `chart-matrix-divider-x-${chart.id}-${xi}`, order: order + offset++, bounds, x: x - .5, y: plot.y, width: 1, height: plot.height, style: gridStyle }); }
    for (let yi = 1; yi < yBandCount; yi++) { const y = yPixel(yBands[yi]); nodes.push({ type: 'rect', id: `chart-matrix-divider-y-${chart.id}-${yi}`, order: order + offset++, bounds, x: plot.x, y: y - .5, width: plot.width, height: 1, style: gridStyle }); }
    chart.series.forEach((series, seriesIndex) => {
      const explicit = series.values.length > 0 && Array.isArray(series.values[0]);
      const [vx, vy] = explicit ? (series.values as [number, number][])[0] : [chart.axis_x.min, (series.values as number[])[0] ?? chart.axis_y.min];
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      const r = Math.max(1, series.size ?? 5);
      const x = xPixel(vx), y = yPixel(vy);
      nodes.push({ type: 'ellipse', id: `chart-matrix-point-${chart.id}-${series.id}`, order: order + offset++, bounds, cx: x, cy: y, rx: r, ry: r, style: { fill: paint(color, diagnostics, chart.id) } });
      if (showLabels && series.label) nodes.push(chartText(`chart-matrix-label-${chart.id}-${series.id}`, order + offset++, bounds, x + r + 4, y - 7, 120, 14, series.label, chart));
    });
  } else if (chart.chart_type === 'custom') {
    // Every series draws its own `symbol.points` polygon (offsets in local
    // mark-space, not data units) at each of its data points instead of the
    // usual bar/line/dot mark. A series without a symbol falls back to a
    // plain dot, same as the generic cartesian path below.
    chart.series.forEach((series, seriesIndex) => {
      const explicit = series.values.length > 0 && Array.isArray(series.values[0]);
      const pairs = explicit ? (series.values as number[][]).map(v => [v[0], v[1]] as [number, number]) : (series.values as number[]).map((y, i) => [chart.axis_x.min + i * chart.axis_x.step, y] as [number, number]);
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      pairs.forEach(([vx, vy], i) => {
        const x = plot.x + mapChartValue(vx, chart.axis_x, plot.width), y = plot.y + plot.height - mapChartValue(vy, chart.axis_y, plot.height);
        const style: SceneStyle = { fill: paint(color, diagnostics, chart.id), stroke: series.stroke ? { kind: 'solid', color: series.stroke } : undefined, strokeWidth: series.stroke ? finite(series.stroke_width, 1) : undefined };
        if (series.symbol?.points.length) {
          const d = `${series.symbol.points.map(([dx, dy], pi) => `${pi === 0 ? 'M' : 'L'} ${x + dx} ${y + dy}`).join(' ')} Z`;
          nodes.push({ type: 'path', id: `chart-custom-mark-${chart.id}-${series.id}-${i}`, order: order + offset++, bounds, d, style });
        } else {
          nodes.push({ type: 'ellipse', id: `chart-custom-mark-${chart.id}-${series.id}-${i}`, order: order + offset++, bounds, cx: x, cy: y, rx: 3, ry: 3, style });
        }
      });
    });
  } else if (chart.chart_type === 'bar' && stackedMode) {
    const count = Math.max(1, ...chart.series.map(item => item.values.length)), slot = plot.width / count, barWidth = Math.max(1, slot - 8);
    for (let i = 0; i < count; i++) {
      chart.series.forEach((series, seriesIndex) => {
        const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
        const seg = stackedSegment(chart, stackedMode, i, seriesIndex, plot.height);
        const y = plot.y + plot.height - Math.max(seg.pixelStart, seg.pixelEnd);
        const height = Math.max(1, Math.abs(seg.pixelEnd - seg.pixelStart));
        const x = plot.x + i * slot + 4;
        nodes.push({ type: 'rect', id: `chart-bar-${chart.id}-${series.id}-${i}`, order: order + offset++, bounds, x, y, width: barWidth, height, rx: 2, sfSeries: series.id, sfValueIndex: i, style: { fill: paint(color, diagnostics, chart.id) } });
      });
    }
  } else {
    chart.series.forEach((series, seriesIndex) => {
      const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
      const explicit = series.values.length > 0 && Array.isArray(series.values[0]);
      const pairs = explicit ? series.values as [number, number][] : (series.values as number[]).map((y, i) => [chart.axis_x.min + i * chart.axis_x.step, y] as [number, number]);
      if (chart.chart_type === 'bar') {
        const count = Math.max(1, ...chart.series.map(item => item.values.length)), slot = plot.width / count, barWidth = Math.max(1, (slot - 8) / Math.max(1, chart.series.length));
        series.values.forEach((value, i) => {
          const yValue = Array.isArray(value) ? value[1] : value;
          const height = Math.max(0, mapChartValue(yValue, chart.axis_y, plot.height));
          const x = plot.x + i * slot + 4 + seriesIndex * barWidth, width = Math.max(1, barWidth - 2);
          nodes.push({ type: 'rect', id: `chart-bar-${chart.id}-${series.id}-${i}`, order: order + offset++, bounds, x, y: plot.y + plot.height - height, width, height, rx: 2, sfSeries: series.id, sfValueIndex: i, style: { fill: paint(color, diagnostics, chart.id) } });
          const err = series.error?.[i];
          if (err != null) {
            const [lo, hi] = errorBarRange(yValue, err);
            // Not `color` (the bar's own fill): a symmetric error range's
            // lower half sits INSIDE the bar itself (between its top and
            // axis value), so the series color would vanish against its own
            // fill there - only the upper half, against the plot background,
            // would ever show. The chart's own ink reads against both.
            nodes.push(errorWhiskerNode(`chart-bar-error-${chart.id}-${series.id}-${i}`, order + offset++, bounds, x + width / 2,
              plot.y + plot.height - mapChartValue(lo, chart.axis_y, plot.height), plot.y + plot.height - mapChartValue(hi, chart.axis_y, plot.height), chart.text_color ?? '#0f172a', series.id, i));
          }
        });
      } else {
        const pixels = pairs.map(([x, y]) => ({ x: plot.x + mapChartValue(x, chart.axis_x, plot.width), y: plot.y + plot.height - mapChartValue(y, chart.axis_y, plot.height) }));
        if (chart.chart_type === 'line' && pixels.length) nodes.push({ type: 'path', id: `chart-line-${chart.id}-${series.id}`, order: order + offset++, bounds, d: `M ${pixels.map((point, i) => `${i ? 'L' : ''} ${point.x} ${point.y}`).join(' ')}`, style: { fill: { kind: 'none' }, stroke: paint(color, diagnostics, chart.id), strokeWidth: 2, lineJoin: 'round' } });
        pixels.forEach((point, i) => {
          const err = chart.chart_type === 'line' ? series.error?.[i] : undefined;
          if (err != null) {
            const [lo, hi] = errorBarRange(pairs[i][1], err);
            nodes.push(errorWhiskerNode(`chart-line-error-${chart.id}-${series.id}-${i}`, order + offset++, bounds, point.x,
              plot.y + plot.height - mapChartValue(lo, chart.axis_y, plot.height), plot.y + plot.height - mapChartValue(hi, chart.axis_y, plot.height), representativeColor(color, '#0f172a'), series.id, i));
          }
          nodes.push({ type: 'ellipse', id: `chart-point-${chart.id}-${series.id}-${i}`, order: order + offset++, bounds, cx: point.x, cy: point.y, rx: chart.chart_type === 'scatter' ? 4 : 3, ry: chart.chart_type === 'scatter' ? 4 : 3, sfSeries: series.id, sfValueIndex: i, style: { fill: paint(color, diagnostics, chart.id) } });
        });
      }
    });
  }
  // Rules plot a fixed position on axis_y - meaningless for heatmap, whose
  // axis_y buckets a value into a threshold band rather than placing it at a
  // pixel, so there's no coherent "position" for a rule line to sit at.
  if (chart.chart_type !== 'heatmap' && chart.chart_type !== 'sankey' && chart.chart_type !== 'treemap' && chart.chart_type !== 'mekko' && chart.chart_type !== 'pie' && chart.chart_type !== 'matrix') {
    const ruleNodes = buildChartRules(chart, plot, bounds, order + offset);
    nodes.push(...ruleNodes); offset += ruleNodes.length;
  }
  // Heatmap draws its own row/column headers inside its own branch above -
  // axis_x/axis_y have no numeric ticks to label here.
  if (showLabels && chart.chart_type !== 'heatmap' && chart.chart_type !== 'sankey' && chart.chart_type !== 'treemap' && chart.chart_type !== 'mekko' && chart.chart_type !== 'pie' && chart.chart_type !== 'matrix') {
    if (chart.chart_type === 'bar') {
      // bar draws one slot per Series entry (see the bar branches above),
      // entirely independent of axis_x's min/max/step - ticking axis_x
      // instead would land ticks at interval boundaries, not bar centers.
      // One label per bar, centered on that bar's actual slot.
      const barCount = Math.max(1, ...chart.series.map(series => series.values.length)), barSlot = plot.width / barCount;
      const barLabels = chart.config?.categories?.length ? chart.config.categories : Array.from({ length: barCount }, (_, i) => String(i + 1));
      for (let i = 0; i < barCount; i++) {
        const x = plot.x + (i + 0.5) * barSlot;
        nodes.push(chartText(`chart-x-tick-${chart.id}-${i}`, order + offset++, bounds, x - barSlot / 2, plot.y + plot.height + 4, barSlot, 18, barLabels[i] ?? String(i + 1), chart, 'center'));
      }
    } else {
      chartTicks(chart.axis_x).forEach(tick => { const x = plot.x + mapChartValue(tick, chart.axis_x, plot.width); nodes.push(chartText(`chart-x-tick-${chart.id}-${tick}`, order + offset++, bounds, x - 20, plot.y + plot.height + 4, 40, 18, String(tick), chart, 'center')); });
    }
    chartTicks(chart.axis_y).forEach(tick => { const y = plot.y + plot.height - mapChartValue(tick, chart.axis_y, plot.height); nodes.push(chartText(`chart-y-tick-${chart.id}-${tick}`, order + offset++, bounds, chart.x, y - 6, padLeft - 8, 18, String(tick), chart, 'right')); });
    if (chart.axis_x.label) nodes.push(chartText(`chart-x-label-${chart.id}`, order + offset++, bounds, plot.x, chart.y + chart.height - 18, plot.width, 18, chart.axis_x.label, chart, 'center'));
    if (chart.axis_y.label) nodes.push(chartText(`chart-y-label-${chart.id}`, order + offset++, bounds, chart.x + 12, plot.y + plot.height, plot.height, 18, chart.axis_y.label, chart, 'center', -90));
  }
  return nodes;
}
