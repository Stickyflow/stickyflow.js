import { resolveOwner } from '../../domContract';
import {
  TABLE_COLUMN_DIVIDER_ATTR,
  TABLE_COLUMN_START_WIDTH_ATTR,
  TABLE_COLUMN_WIDTH_SCALE_ATTR,
} from '../../model/domContractAttributes';
import type { OwnerRef } from '../../viewer';

export interface ColumnResizeTarget {
  owner: OwnerRef;
  columnId: string;
  startWidth: number;
  widthScale: number;
  node: Element;
}

export function resolveColumnResizeTarget(event: PointerEvent): ColumnResizeTarget | null {
  const node = (event.target as Element | null)?.closest?.(`[${TABLE_COLUMN_DIVIDER_ATTR}]`) ?? null;
  if (!node) {
    return null;
  }
  const columnId = node.getAttribute(TABLE_COLUMN_DIVIDER_ATTR);
  const startWidth = Number(node.getAttribute(TABLE_COLUMN_START_WIDTH_ATTR));
  const widthScale = Number(node.getAttribute(TABLE_COLUMN_WIDTH_SCALE_ATTR));
  const owner = resolveOwner(node);
  if (!columnId || !owner || !Number.isFinite(startWidth) || !(widthScale > 0)) {
    return null;
  }
  return { owner, columnId, startWidth, widthScale, node };
}
