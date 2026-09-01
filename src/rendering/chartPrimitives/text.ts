import type { Chart } from '../../model/charts';
import { DEFAULT_FONT, finite } from '../renderPrimitives';
import type { Bounds, SceneText } from '../renderScene';

export function chartText(
  id: string,
  order: number,
  bounds: Bounds,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  chart: Chart,
  align: 'left' | 'center' | 'right' = 'left',
  rotation?: number,
): SceneText {
  return {
    type: 'text',
    id,
    order,
    bounds,
    x,
    y,
    width,
    height,
    lines: [text],
    fontFamily: chart.font_family ?? DEFAULT_FONT,
    fontSize: Math.max(9, finite(chart.font_size, 12)),
    fontWeight: 'normal',
    color: chart.text_color ?? '#0f172a',
    align,
    verticalAlign: 'top',
    lineHeight: 1.2,
    rotation,
    rotationCenter: rotation ? { x, y } : undefined,
  };
}
