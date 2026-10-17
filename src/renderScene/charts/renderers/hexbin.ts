import type { HexbinChart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { paint } from '../../scene';
import { colorAtRamp } from '../field/colorRamp';
import { computeHexBins } from '../geometry';
import { CHART_COLORS, DEFAULT_HEX_RADIUS, mapChartValue, resolveChartShadow } from '../primitives';
import type { ChartRenderContext } from './types';

const DEFAULT_MIN_OPACITY = 0.15;
// Shrinking the radius by this much per pixel of gap opens that gap between the flat sides of two neighbours.
const GAP_TO_RADIUS = 1 / Math.sqrt(3);

function hexPath(cx: number, cy: number, radius: number): string {
  const points: string[] = [];
  for (let corner = 0; corner < 6; corner++) {
    const angle = ((-60 + 60 * corner) * Math.PI) / 180;
    points.push(`${corner === 0 ? 'M' : 'L'} ${cx + radius * Math.cos(angle)} ${cy + radius * Math.sin(angle)}`);
  }
  return `${points.join(' ')} Z`;
}

export function renderHexbin(context: ChartRenderContext<HexbinChart>): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const config = chart.config;
  const hexRadius = Math.max(1, config?.hexRadius ?? DEFAULT_HEX_RADIUS);
  const drawRadius = Math.max(0.5, hexRadius - Math.max(0, config?.hexGap ?? 0) * GAP_TO_RADIUS);
  const strokeWidth = config?.hexStrokeWidth ?? 0;
  const minOpacity = Math.min(1, Math.max(0, config?.hexMinOpacity ?? DEFAULT_MIN_OPACITY));
  const shadow = resolveChartShadow(chart.shadowStyle);
  const clipPath = shadow
    ? `M ${plot.x} ${plot.y} H ${plot.x + plot.width} V ${plot.y + plot.height} H ${plot.x} Z`
    : undefined;
  chart.series.forEach((series, seriesIndex) => {
    const explicit = series.values.length > 0 && Array.isArray(series.values[0]);
    const pairs = explicit
      ? (series.values as [number, number][])
      : (series.values as number[]).map((y, i) => [chart.axisX.min + i * chart.axisX.step, y] as [number, number]);
    const pixelPoints = pairs.map(([vx, vy]) => ({
      x: mapChartValue(vx, chart.axisX, plot.width),
      y: plot.height - mapChartValue(vy, chart.axisY, plot.height),
    }));
    const bins = computeHexBins(pixelPoints, hexRadius);
    const maxCount = Math.max(1, ...bins.map(bin => bin.count));
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    const ramp = config?.scale;
    bins.forEach((bin, i) => {
      const share = bin.count / maxCount;
      const fill = ramp ? colorAtRamp(ramp, share) : color;
      nodes.push({
        type: 'path',
        id: `chart-hexbin-${chart.id}-${series.id}-${i}`,
        order: nextOrder(),
        bounds,
        d: hexPath(plot.x + bin.cx, plot.y + bin.cy, drawRadius),
        style: {
          fill: paint(fill, diagnostics, chart.id),
          stroke: strokeWidth > 0 ? paint(config?.hexStrokeColor ?? fill, diagnostics, chart.id) : undefined,
          strokeWidth: strokeWidth > 0 ? strokeWidth : undefined,
          opacity: ramp ? undefined : Math.max(minOpacity, share),
          shadow,
          clip: clipPath ? { type: 'path', d: clipPath } : undefined,
        },
      });
    });
  });
  return nodes;
}
