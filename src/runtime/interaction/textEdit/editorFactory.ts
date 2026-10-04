import { findOwnerNode, isPrimary, isTextLabel, pxPerUnit } from '../../dom';
import type { OwnerRef } from '../../viewer';
import type { Emitter } from '../events';
import { ActiveTextEditor } from './activeEditor';
import {
  findIsometricLabelBackground,
  resolveIsometricLabelRect,
  resolveTextEditRect,
  type TextEditRect,
} from './geometry';
import { bindTextareaAutoGrow, createTextEditor } from './textarea';

function textFontSize(textNode: SVGGraphicsElement | null): number {
  return Number.parseFloat(textNode?.getAttribute('font-size') || '14');
}

export function createActiveTextEditor(
  svg: SVGSVGElement,
  owner: OwnerRef,
  emitter: Emitter,
  onClose: () => void,
): ActiveTextEditor | null {
  const textNode = findOwnerNode(svg, owner.id, isTextLabel);
  const isometric = owner.role === 'isometric';
  const rect: TextEditRect | null = isometric
    ? resolveIsometricLabelRect(svg, owner)
    : resolveTextEditRect(owner, textNode, findOwnerNode(svg, owner.id, isPrimary));
  if (!rect) {
    return null;
  }

  const originalText = textNode?.textContent ?? '';
  // The label is drawn at the canvas zoom, so the editor's text has to be too
  // or it visibly jumps in size when editing starts.
  const fontSize = isometric ? textFontSize(textNode) * pxPerUnit(svg) : textFontSize(textNode);
  const labelBackground = isometric ? findIsometricLabelBackground(svg, owner) : null;
  const textarea = createTextEditor({
    text: originalText,
    rect,
    fontSize,
    fontFamily: textNode?.getAttribute('font-family') || 'sans-serif',
    label: isometric ? { background: labelBackground?.getAttribute('fill') || '#ffffff' } : undefined,
  });

  return new ActiveTextEditor({
    textarea,
    originalText,
    commit: text => emitter.emit('textChange', { owner, text }),
    // A floating label stays one line; growing it would drift off the pill.
    unbindAutoGrow: isometric ? () => {} : bindTextareaAutoGrow(textarea, Math.max(rect.height, fontSize * 1.6)),
    onClose,
  });
}
