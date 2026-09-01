import { pixelForValue } from './scale';
import type { ChartValueDragState } from './types';

export function updateChartValuePreview(drag: ChartValueDragState, value: number): void {
  const y = pixelForValue(value, drag.scale);
  if (drag.isBar) {
    drag.element.setAttribute('y', String(Math.min(y, drag.baseY)));
    drag.element.setAttribute('height', String(Math.max(0, Math.abs(drag.baseY - y))));
    return;
  }
  drag.element.setAttribute('cy', String(y));
}
