import { findOwnerNode, isPrimary, isTextLabel } from '../../domContract';
import type { OwnerRef } from '../../viewer';
import type { Emitter } from '../events';
import { ActiveTextEditor } from './activeEditor';
import { resolveTextEditRect } from './geometry';
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
  const primaryNode = findOwnerNode(svg, owner.id, isPrimary);
  const rect = resolveTextEditRect(owner, textNode, primaryNode);
  if (!rect) {
    return null;
  }

  const originalText = textNode?.textContent ?? '';
  const fontSize = textFontSize(textNode);
  const textarea = createTextEditor({
    text: originalText,
    rect,
    fontSize,
    fontFamily: textNode?.getAttribute('font-family') || 'sans-serif',
  });

  return new ActiveTextEditor({
    textarea,
    originalText,
    commit: text => emitter.emit('textChange', { owner, text }),
    unbindAutoGrow: bindTextareaAutoGrow(textarea, Math.max(rect.height, fontSize * 1.6)),
    onClose,
  });
}
