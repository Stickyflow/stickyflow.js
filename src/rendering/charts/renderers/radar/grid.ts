import { finite } from '../../../renderPrimitives';
import type { RenderNode } from '../../../scene';
import { chartTicks } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { RadarGeometry } from './types';

export function renderRadarGrid(context: ChartRenderContext, geometry: RadarGeometry): RenderNode[] {
  if (context.chart.show_grid === false) {
    return [];
  }

  return [...renderRings(context, geometry), ...renderSpokes(context, geometry)];
}

function renderRings(context: ChartRenderContext, geometry: RadarGeometry): RenderNode[] {
  return chartTicks(context.chart.axis_y)
    .filter(tick => tick > context.chart.axis_y.min)
    .map(tick => createRingNode(context, geometry, tick));
}

function createRingNode(context: ChartRenderContext, geometry: RadarGeometry, tick: number): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const ringRadius = geometry.radiusForValue(tick);
  const style = {
    fill: { kind: 'none' } as const,
    stroke: { kind: 'solid' as const, color: chart.grid_color ?? '#e2e8f0' },
    strokeWidth: finite(chart.grid_width, 1),
  };

  if (geometry.circular) {
    return {
      type: 'ellipse',
      id: `chart-radial-ring-${chart.id}-${tick}`,
      order: nextOrder(),
      bounds,
      cx: geometry.centerX,
      cy: geometry.centerY,
      rx: ringRadius,
      ry: ringRadius,
      style,
    };
  }
  return {
    type: 'path',
    id: `chart-radar-ring-${chart.id}-${tick}`,
    order: nextOrder(),
    bounds,
    d: geometry.polygonPath(ringRadius),
    style,
  };
}

function renderSpokes(context: ChartRenderContext, geometry: RadarGeometry): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  return geometry.categories.map((_, categoryIndex) => {
    const edge = geometry.pointAt(geometry.radius, categoryIndex);
    return {
      type: 'path',
      id: `chart-radar-spoke-${chart.id}-${categoryIndex}`,
      order: nextOrder(),
      bounds,
      d: `M ${geometry.centerX} ${geometry.centerY} L ${edge.x} ${edge.y}`,
      style: {
        fill: { kind: 'none' },
        stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' },
        strokeWidth: finite(chart.grid_width, 1),
      },
    };
  });
}
