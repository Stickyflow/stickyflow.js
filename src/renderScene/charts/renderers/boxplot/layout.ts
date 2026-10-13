import { finite } from '../../../scene';
import { representativeColor } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { BoxplotLayout } from './types';

export function createBoxplotLayout(context: ChartRenderContext): BoxplotLayout {
  const { chart, plot } = context;
  const orientation = chart.config?.orientation ?? 'vertical';
  const boxCount = Math.max(1, chart.series.length);
  const slotWidth = (orientation === 'horizontal' ? plot.height : plot.width) / boxCount;
  const widthFraction = Math.min(1, Math.max(0.05, chart.config?.boxWidth ?? 0.6));
  return {
    orientation,
    slotWidth,
    boxWidth: Math.max(4, slotWidth * widthFraction),
    cornerRadius: chart.config?.barCornerRadius ?? 2,
    showPoints: chart.config?.showBoxplotPoints ?? true,
    borderColor: representativeColor(chart.config?.barBorderColor, '#000000'),
    borderWidth: finite(chart.config?.barBorderWidth, 1),
  };
}
