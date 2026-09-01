import { finite } from '../../renderPrimitives';
import type { ChartRenderContext } from '../types';
import type { PieGeometry, PiePoint } from './types';

export function createPieGeometry(context: ChartRenderContext): PieGeometry {
  const { chart, plot } = context;
  const outerRadius = Math.max(1, Math.min(plot.width, plot.height) / 2 - 4);
  return {
    centerX: plot.x + plot.width / 2,
    centerY: plot.y + plot.height / 2,
    outerRadius,
    innerRadius: Math.max(0, Math.min(chart.config?.innerRadius ?? 0, outerRadius - 1)),
    total: chart.series.reduce((sum, series) => sum + Math.max(0, finite((series.values as number[])[0], 0)), 0) || 1,
  };
}

export function pieArcPoint(geometry: PieGeometry, angle: number, radius: number): PiePoint {
  return {
    x: geometry.centerX + radius * Math.cos(angle),
    y: geometry.centerY + radius * Math.sin(angle),
  };
}
