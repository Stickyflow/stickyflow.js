import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import type { ChartRenderContext } from '../types';

const DEFAULT_HATCH = { angle: 45, spacing: 7, width: 1.5 };
const MIN_HATCH_SPACING = 2;

function roundedRectPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) {
    return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  }
  return (
    `M ${x + r} ${y} H ${x + width - r} Q ${x + width} ${y} ${x + width} ${y + r} ` +
    `V ${y + height - r} Q ${x + width} ${y + height} ${x + width - r} ${y + height} ` +
    `H ${x + r} Q ${x} ${y + height} ${x} ${y + height - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
  );
}

// Parallel lines at any angle, long enough to cover the whole rectangle (the track clips them).
function hatchPath(x: number, y: number, width: number, height: number, angle: number, spacing: number): string {
  const radians = (angle * Math.PI) / 180;
  const direction = { x: Math.cos(radians), y: Math.sin(radians) };
  const normal = { x: -direction.y, y: direction.x };
  const center = { x: x + width / 2, y: y + height / 2 };
  const reach = Math.hypot(width, height) / 2;
  const segments: string[] = [];
  for (let offset = -reach; offset <= reach; offset += spacing) {
    const cx = center.x + normal.x * offset;
    const cy = center.y + normal.y * offset;
    segments.push(
      `M ${cx - direction.x * reach} ${cy - direction.y * reach} L ${cx + direction.x * reach} ${cy + direction.y * reach}`,
    );
  }
  return segments.join(' ');
}

export function barTrackEnabled(context: ChartRenderContext): boolean {
  return context.chart.config?.barTrack === true;
}

// A full-height track behind one bar, optionally hatched.
export function createBarTrackNodes(
  context: ChartRenderContext,
  id: string,
  frame: { x: number; width: number },
): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const config = chart.config;
  const d = roundedRectPath(frame.x, plot.y, frame.width, plot.height, config?.barCornerRadius ?? 2);
  const nodes: RenderNode[] = [
    {
      type: 'path',
      id: `chart-bar-track-${chart.id}-${id}`,
      order: nextOrder(),
      bounds,
      d,
      style: { fill: paint(config?.barTrackColor ?? chart.gridColor ?? '#e2e8f0', diagnostics, chart.id), pointerEvents: 'none' },
    },
  ];
  if (config?.barTrackHatch) {
    nodes.push({
      type: 'path',
      id: `chart-bar-track-hatch-${chart.id}-${id}`,
      order: nextOrder(),
      bounds,
      d: hatchPath(
        frame.x,
        plot.y,
        frame.width,
        plot.height,
        finite(config.barTrackHatchAngle, DEFAULT_HATCH.angle),
        Math.max(MIN_HATCH_SPACING, finite(config.barTrackHatchSpacing, DEFAULT_HATCH.spacing)),
      ),
      style: {
        fill: { kind: 'none' },
        stroke: paint(config.barTrackHatchColor ?? chart.gridColor ?? '#cbd5e1', diagnostics, chart.id),
        strokeWidth: finite(config.barTrackHatchWidth, DEFAULT_HATCH.width),
        pointerEvents: 'none',
        clip: { type: 'path', d },
      },
    });
  }
  return nodes;
}
