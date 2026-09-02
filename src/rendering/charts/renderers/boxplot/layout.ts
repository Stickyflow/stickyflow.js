import { finite } from '../../../scene';
import type { ChartRenderContext } from '../types';
import type { BoxplotLayout } from './types';

export function createBoxplotLayout(context: ChartRenderContext): BoxplotLayout {
  const { chart, plot } = context;
  const boxCount = Math.max(1, chart.series.length);
  const slotWidth = plot.width / boxCount;
  const widthFraction = Math.min(1, Math.max(0.05, chart.config?.boxWidth ?? 0.6));
  return {
    slotWidth,
    boxWidth: Math.max(4, slotWidth * widthFraction),
    cornerRadius: chart.config?.barCornerRadius ?? 2,
    showPoints: chart.config?.showBoxplotPoints ?? true,
    borderColor: chart.config?.barBorderColor || '#000000',
    borderWidth: finite(chart.config?.barBorderWidth, 1),
  };
}
