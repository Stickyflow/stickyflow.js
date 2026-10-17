import { finite } from '../../../scene';
import { representativeColor } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { BoxplotLayout } from './types';

export function createBoxplotLayout(context: ChartRenderContext): BoxplotLayout {
  const { chart, plot } = context;
  const orientation = chart.config?.orientation ?? 'vertical';
  const boxCount = Math.max(1, chart.series.length);
  const slotWidth = (orientation === 'horizontal' ? plot.height : plot.width) / boxCount;
  const borderColor = representativeColor(chart.config?.barBorderColor, '#000000');
  const widthFraction = Math.min(1, Math.max(0.05, chart.config?.boxWidth ?? 0.6));
  return {
    orientation,
    slotWidth,
    boxWidth: Math.max(4, slotWidth * widthFraction),
    cornerRadius: chart.config?.barCornerRadius ?? 2,
    showPoints: chart.config?.showBoxplotPoints ?? true,
    borderColor,
    borderWidth: finite(chart.config?.barBorderWidth, 1),
    whiskerWidth: Math.max(0, finite(chart.config?.boxWhiskerWidth, 1)),
    medianWidth: Math.max(0, finite(chart.config?.boxMedianWidth, 2)),
    medianColor: chart.config?.boxMedianColor ?? borderColor,
    whiskerColor: chart.config?.boxWhiskerColor,
    capSize: Math.max(0, finite(chart.config?.boxCapSize, 0.4)),
    pointSize: Math.max(0, finite(chart.config?.boxPointSize, 3)),
    pointOpacity: Math.min(1, Math.max(0, finite(chart.config?.boxPointOpacity, 0.7))),
    jitter: Math.max(0, finite(chart.config?.boxJitter, 1)),
  };
}
