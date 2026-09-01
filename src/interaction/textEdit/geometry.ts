import type { OwnerRef } from '../../viewer';
import { screenRectOf } from '../../viewer/domQuery';

export interface TextEditRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const FALLBACK_WIDTH = 120;
const FALLBACK_HEIGHT = 28;

function centeredLabelRect(primaryNode: SVGGraphicsElement): TextEditRect {
  const primaryRect = screenRectOf(primaryNode);
  return {
    left: primaryRect.left + (primaryRect.width - FALLBACK_WIDTH) / 2,
    top: primaryRect.top + (primaryRect.height - FALLBACK_HEIGHT) / 2,
    width: FALLBACK_WIDTH,
    height: FALLBACK_HEIGHT,
  };
}

export function resolveTextEditRect(
  owner: OwnerRef,
  textNode: SVGGraphicsElement | null,
  primaryNode: SVGGraphicsElement | null,
): TextEditRect | null {
  if (owner.role === 'entity') {
    return primaryNode ? screenRectOf(primaryNode) : null;
  }
  if (textNode) {
    return screenRectOf(textNode);
  }
  return primaryNode ? centeredLabelRect(primaryNode) : null;
}
