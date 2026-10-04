import { findOwnerNode, screenRectOf } from '../../dom';
import type { OwnerRef } from '../../viewer';

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
  if (owner.role === 'shape') {
    return primaryNode ? screenRectOf(primaryNode) : null;
  }
  if (textNode) {
    return screenRectOf(textNode);
  }
  return primaryNode ? centeredLabelRect(primaryNode) : null;
}

const ISOMETRIC_LABEL_MARK = 'isometric-label';
const ISOMETRIC_LABEL_PADDING_PX = 6;

/** An isometric object's label floats above the cube, so the editor has to
 *  sit on the label, not on the cube. Prefer the label's background pill,
 *  which is exactly what the reader sees; without a labelBackground, pad
 *  the text's own box. */
const isIsometricLabel = (el: Element, tagName: 'rect' | 'text'): boolean =>
  el.getAttribute('data-sf-mark') === ISOMETRIC_LABEL_MARK && el.tagName.toLowerCase() === tagName;

export function findIsometricLabelBackground(svg: SVGSVGElement, owner: OwnerRef): SVGGraphicsElement | null {
  return findOwnerNode(svg, owner.id, el => isIsometricLabel(el, 'rect'));
}

export function resolveIsometricLabelRect(svg: SVGSVGElement, owner: OwnerRef): TextEditRect | null {
  const background = findIsometricLabelBackground(svg, owner);
  if (background) {
    return screenRectOf(background);
  }
  const text = findOwnerNode(svg, owner.id, el => isIsometricLabel(el, 'text'));
  if (!text) {
    return null;
  }
  const rect = screenRectOf(text);
  return {
    left: rect.left - ISOMETRIC_LABEL_PADDING_PX,
    top: rect.top - ISOMETRIC_LABEL_PADDING_PX / 2,
    width: rect.width + ISOMETRIC_LABEL_PADDING_PX * 2,
    height: rect.height + ISOMETRIC_LABEL_PADDING_PX,
  };
}
