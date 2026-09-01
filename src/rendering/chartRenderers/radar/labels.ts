import { chartText } from '../../chartPrimitives';
import type { RenderNode } from '../../renderScene';
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
  return chartText(
    `chart-radar-label-${chart.id}-${categoryIndex}`,
    nextOrder(),
    bounds,
    labelX(labelPoint.x, horizontalOffset, width),
    labelPoint.y - 6,
    width,
    30,
    category,
    chart,
    labelAlignment(horizontalOffset),
  );
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
