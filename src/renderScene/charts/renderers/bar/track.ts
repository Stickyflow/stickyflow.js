import type { RenderNode } from '../../../scene';
import { paint } from '../../../scene';
import type { ChartRenderContext } from '../types';

const HATCH_SPACING = 7;
const HATCH_WIDTH = 1.5;

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

function hatchPath(x: number, y: number, width: number, height: number): string {
  const segments: string[] = [];
  for (let offset = -height; offset < width; offset += HATCH_SPACING) {
    segments.push(`M ${x + offset} ${y} L ${x + offset + height} ${y + height}`);
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
      d: hatchPath(frame.x, plot.y, frame.width, plot.height),
      style: {
        fill: { kind: 'none' },
        stroke: paint(config.barTrackHatchColor ?? chart.gridColor ?? '#cbd5e1', diagnostics, chart.id),
        strokeWidth: HATCH_WIDTH,
        pointerEvents: 'none',
        clip: { type: 'path', d },
      },
    });
  }
  return nodes;
}
