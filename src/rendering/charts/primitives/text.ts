import type { Chart } from '../../../model/charts';
import { DEFAULT_FONT, finite } from '../../renderPrimitives';
import type { Bounds, SceneText } from '../../scene';

export interface ChartTextOptions {
  id: string;
  order: number;
  bounds: Bounds;
  frame: { x: number; y: number; width: number; height: number };
  text: string;
  chart: Chart;
  align?: 'left' | 'center' | 'right';
  rotation?: number;
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
    fontFamily: chart.font_family ?? DEFAULT_FONT,
    fontSize: Math.max(9, finite(chart.font_size, 12)),
    fontWeight: 'normal',
    color: chart.text_color ?? '#0f172a',
    align: options.align ?? 'left',
    verticalAlign: 'top',
    lineHeight: 1.2,
    rotation: options.rotation,
    rotationCenter: options.rotation ? { x: frame.x, y: frame.y } : undefined,
  };
}
