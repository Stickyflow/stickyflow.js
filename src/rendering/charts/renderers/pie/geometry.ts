import type { PieChart } from '../../../../model/chart';
import { finite } from '../../../scene';
import { pieArcPoint, resolvePieRadii } from '../../primitives/pieShape';
import type { ChartRenderContext } from '../types';
import type { PieGeometry } from './types';

export { pieArcPoint };

export function createPieGeometry(context: ChartRenderContext<PieChart>): PieGeometry {
  const { chart, plot } = context;
  const { outerRadius, innerRadius, cornerRadius } = resolvePieRadii(
    plot.width,
    plot.height,
    chart.config?.innerRadius,
    chart.config?.pieCornerRadius,
  );
  return {
    centerX: plot.x + plot.width / 2,
    centerY: plot.y + plot.height / 2,
    outerRadius,
    innerRadius,
    cornerRadius,
    total: chart.series.reduce((sum, series) => sum + Math.max(0, finite((series.values as number[])[0], 0)), 0) || 1,
  };
}
