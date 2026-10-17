import type { RenderNode } from '../../../scene';
import { finite } from '../../../scene';
import { chartTicks } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { RadarFamilyChart, RadarGeometry } from './types';

export function renderRadarGrid(context: ChartRenderContext<RadarFamilyChart>, geometry: RadarGeometry): RenderNode[] {
  if (context.chart.showGrid === false) {
    return [];
  }

  return [...renderRings(context, geometry), ...(geometry.showSpokes ? renderSpokes(context, geometry) : [])];
}

function renderRings(context: ChartRenderContext<RadarFamilyChart>, geometry: RadarGeometry): RenderNode[] {
  return chartTicks(context.chart.axisY)
    .filter(tick => tick > context.chart.axisY.min)
    .map(tick => createRingNode(context, geometry, tick));
}

function createRingNode(
  context: ChartRenderContext<RadarFamilyChart>,
  geometry: RadarGeometry,
  tick: number,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const ringRadius = geometry.radiusForValue(tick);
  const style = {
    fill: { kind: 'none' } as const,
    stroke: { kind: 'solid' as const, color: chart.gridColor ?? '#e2e8f0' },
    strokeWidth: finite(chart.gridWidth, 1),
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

function renderSpokes(context: ChartRenderContext<RadarFamilyChart>, geometry: RadarGeometry): RenderNode[] {
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
        stroke: { kind: 'solid', color: chart.gridColor ?? '#e2e8f0' },
        strokeWidth: finite(chart.gridWidth, 1),
      },
    };
  });
}
