import type { RadialBarChart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { finite, paint } from '../../scene';
import type { ResolvedShadow } from '../primitives';
import { CHART_COLORS, resolveChartShadow } from '../primitives';
import { seriesValueProp } from '../propPath';
import type { ChartRenderContext } from './types';

const START_ANGLE = -Math.PI / 2;
const DEFAULT_RING_THICKNESS = 14;
const DEFAULT_RING_GAP = 4;
const TRACK_OPACITY = 0.18;
const FULL_SWEEP_EPSILON = 1e-4;

interface ArcPoint {
  x: number;
  y: number;
}

function arcPoint(cx: number, cy: number, r: number, angle: number): ArcPoint {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function fullCirclePath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

function annulusPath(cx: number, cy: number, outerRadius: number, innerRadius: number): string {
  return `${fullCirclePath(cx, cy, outerRadius)} ${fullCirclePath(cx, cy, Math.max(0, innerRadius))}`;
}

function arcSegmentPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const start = arcPoint(cx, cy, r, from);
  const end = arcPoint(cx, cy, r, to);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${end.x} ${end.y}`;
}

function ringShadow(shadow: ResolvedShadow, ringThickness: number): ResolvedShadow {
  const blur = Math.min(shadow.blur, ringThickness * 0.6);
  const maxDistance = ringThickness * 0.4;
  const distance = Math.hypot(shadow.dx, shadow.dy);
  const scale = distance > maxDistance ? maxDistance / distance : 1;
  return { ...shadow, blur, dx: shadow.dx * scale, dy: shadow.dy * scale };
}

function ringProgressPath(cx: number, cy: number, r: number, sweep: number): string {
  if (sweep >= Math.PI * 2 - FULL_SWEEP_EPSILON) {
    const start = arcPoint(cx, cy, r, START_ANGLE);
    const mid = arcPoint(cx, cy, r, START_ANGLE + Math.PI);
    return `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${mid.x} ${mid.y} A ${r} ${r} 0 1 1 ${start.x} ${start.y}`;
  }
  const start = arcPoint(cx, cy, r, START_ANGLE);
  const end = arcPoint(cx, cy, r, START_ANGLE + sweep);
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export function renderRadialBar(context: ChartRenderContext<RadialBarChart>): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const centerX = plot.x + plot.width / 2;
  const centerY = plot.y + plot.height / 2;
  const outerRadius = Math.max(1, Math.min(plot.width, plot.height) / 2 - 4);
  const ringThickness = Math.max(1, finite(chart.config?.ringThickness, DEFAULT_RING_THICKNESS));
  const ringGap = Math.max(0, finite(chart.config?.ringGap, DEFAULT_RING_GAP));
  const axisMin = finite(chart.axis_y.min, 0);
  const range = finite(chart.axis_y.max, 100) - axisMin;
  const shadow = resolveChartShadow(chart.shadow_style);

  return chart.series.flatMap((series, index): RenderNode[] => {
    const radius = outerRadius - index * (ringThickness + ringGap) - ringThickness / 2;
    if (radius <= ringThickness / 2) {
      return [];
    }

    const color = paint(series.color ?? CHART_COLORS[index % CHART_COLORS.length], diagnostics, chart.id);
    const value = Math.max(0, finite((series.values as number[])[0], 0));
    const fraction = range > 0 ? Math.min(1, Math.max(0, (value - axisMin) / range)) : 0;

    const track: RenderNode = {
      type: 'ellipse',
      id: `chart-radial-bar-track-${chart.id}-${series.id}`,
      order: nextOrder(),
      bounds,
      cx: centerX,
      cy: centerY,
      rx: radius,
      ry: radius,
      style: { fill: { kind: 'none' }, stroke: color, strokeWidth: ringThickness, opacity: TRACK_OPACITY },
    };
    if (fraction <= 0) {
      return [track];
    }

    const sweep = fraction * Math.PI * 2;
    const progressPath = ringProgressPath(centerX, centerY, radius, sweep);
    const clampedShadow = shadow ? ringShadow(shadow, ringThickness) : undefined;

    const isFullCircle = sweep >= Math.PI * 2 - FULL_SWEEP_EPSILON;
    const stubSweep = Math.min(sweep, ringThickness / radius);
    const casters: RenderNode[] =
      clampedShadow && !isFullCircle
        ? [
            [START_ANGLE, START_ANGLE + stubSweep],
            [START_ANGLE + sweep - stubSweep, START_ANGLE + sweep],
          ].map(
            ([from, to], endIndex): RenderNode => ({
              type: 'path',
              id: `chart-radial-bar-ring-end-shadow-${chart.id}-${series.id}-${endIndex}`,
              order: nextOrder(),
              bounds,
              d: arcSegmentPath(centerX, centerY, radius, from, to),
              style: {
                fill: { kind: 'none' },
                stroke: color,
                strokeWidth: ringThickness,
                lineCap: 'round',
                shadow: clampedShadow,
                clip: {
                  type: 'path',
                  d: annulusPath(centerX, centerY, radius + ringThickness / 2, radius - ringThickness / 2),
                },
              },
            }),
          )
        : [];

    const progress: RenderNode = {
      type: 'path',
      id: `chart-radial-bar-ring-${chart.id}-${series.id}`,
      order: nextOrder(),
      bounds,
      d: progressPath,
      detail: { of: 'chartValue', series: series.id, valueIndex: 0, mark: 'radial-bar-ring' },
      prop: seriesValueProp(series.id, 0),
      style: { fill: { kind: 'none' }, stroke: color, strokeWidth: ringThickness, lineCap: 'round' },
    };

    return [track, ...casters, progress];
  });
}
