import type { Chart } from '../../../model/chart';
import type { Bounds, SceneText } from '../../scene';
import { DEFAULT_FONT, finite } from '../../scene';

export interface ChartTextOptions {
  id: string;
  order: number;
  bounds: Bounds;
  frame: { x: number; y: number; width: number; height: number };
  text: string;
  chart: Chart;
  align?: 'left' | 'center' | 'right';
  rotation?: number;
  role?: 'axis' | 'legend';
}

export function chartText(options: ChartTextOptions): SceneText {
  const { chart, frame } = options;
  return {
    type: 'text',
    id: options.id,
    order: options.order,
    bounds: options.bounds,
    ...frame,
    lines: [options.text],
    fontFamily: (options.role === 'axis' ? chart.axisFontFamily : undefined) ?? chart.fontFamily ?? DEFAULT_FONT,
    fontSize: Math.max(9, finite(options.role === 'axis' ? (chart.axisFontSize ?? chart.fontSize) : chart.fontSize, 12)),
    fontWeight: 'normal',
    color:
      (options.role === 'axis' ? chart.axisLabelColor : options.role === 'legend' ? chart.legendColor : undefined) ??
      chart.textColor ??
      '#0f172a',
    align: options.align ?? 'left',
    verticalAlign: 'top',
    lineHeight: 1.2,
    rotation: options.rotation,
    rotationCenter: options.rotation ? { x: frame.x, y: frame.y } : undefined,
  };
}
