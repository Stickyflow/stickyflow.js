import type { RenderNode } from '../../../scene';
import { chartText } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { RadarGeometry } from './types';

export function renderRadarLabels(context: ChartRenderContext, geometry: RadarGeometry): RenderNode[] {
  if (!context.showLabels) {
    return [];
  }

  return geometry.categories.map((category, categoryIndex) =>
    createCategoryLabel(context, geometry, category, categoryIndex),
  );
}

function createCategoryLabel(
  context: ChartRenderContext,
  geometry: RadarGeometry,
  category: string,
  categoryIndex: number,
): RenderNode {
  const { chart, plot, bounds, nextOrder } = context;
  const labelPoint = geometry.pointAt(geometry.radius + 10, categoryIndex);
  const horizontalOffset = labelPoint.x - geometry.centerX;
  const width = Math.max(64, Math.min(120, plot.width / 3));
  return chartText({
    id: `chart-radar-label-${chart.id}-${categoryIndex}`,
    order: nextOrder(),
    bounds,
    frame: { x: labelX(labelPoint.x, horizontalOffset, width), y: labelPoint.y - 6, width, height: 30 },
    text: category,
    chart,
    align: labelAlignment(horizontalOffset),
  });
}

function labelX(pointX: number, horizontalOffset: number, width: number): number {
  if (horizontalOffset > 8) {
    return pointX;
  }
  if (horizontalOffset < -8) {
    return pointX - width;
  }
  return pointX - width / 2;
}

function labelAlignment(horizontalOffset: number): 'left' | 'center' | 'right' {
  if (horizontalOffset > 8) {
    return 'left';
  }
  if (horizontalOffset < -8) {
    return 'right';
  }
  return 'center';
}
