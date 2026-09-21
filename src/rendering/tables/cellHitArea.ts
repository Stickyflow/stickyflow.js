import type { RenderNode } from '../scene';
import type { TableRenderContext } from './types';

export function renderCellHitArea(
  context: TableRenderContext,
  id: string,
  prop: string | undefined,
  box: { x: number; y: number; width: number; height: number },
): RenderNode[] {
  if (!prop) {
    return [];
  }
  return [
    {
      type: 'rect',
      id,
      order: context.order + 0.4,
      bounds: context.bounds,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      style: { fill: { kind: 'solid', color: 'transparent' }, stroke: { kind: 'none' } },
      prop,
      propKind: 'value',
    },
  ];
}
