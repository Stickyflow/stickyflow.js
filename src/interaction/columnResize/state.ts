import type { OwnerRef } from '../../viewer';
import { resizePointerPosition } from '../resize/pointer';
import { resolveColumnResizeTarget } from './target';

export interface ColumnResizeDragState {
  owner: OwnerRef;
  columnId: string;
  startWidth: number;
  widthScale: number;
  startX: number;
  guideFromY: number;
  guideToY: number;
  pointerId: number;
  moved: boolean;
}

export function createColumnResizeDragState(svg: SVGSVGElement, event: PointerEvent): ColumnResizeDragState | null {
  const target = resolveColumnResizeTarget(event);
  if (!target) {
    return null;
  }
  const { x } = resizePointerPosition(svg, event);
  const node = target.node as SVGGraphicsElement & { setPointerCapture?: (id: number) => void };
  node.setPointerCapture?.(event.pointerId);
  const box = 'getBBox' in node ? node.getBBox() : null;
  return {
    owner: target.owner,
    columnId: target.columnId,
    startWidth: target.startWidth,
    widthScale: target.widthScale,
    startX: x,
    guideFromY: box?.y ?? 0,
    guideToY: box ? box.y + box.height : 0,
    pointerId: event.pointerId,
    moved: false,
  };
}
