import { findOwnerNode, isPrimary, isTextLabel } from '../../dom';
import type { OwnerRef } from '../../viewer';
import type { Emitter } from '../events';
import { ActiveTextEditor } from './activeEditor';
import { resolveTextEditRect } from './geometry';
import { bindTextareaAutoGrow, createTextEditor } from './textarea';

function textFontSize(textNode: SVGGraphicsElement | null): number {
  return Number.parseFloat(textNode?.getAttribute('font-size') || '14');
}

function textAlign(owner: OwnerRef, textNode: SVGGraphicsElement | null): 'left' | 'center' | 'right' {
  if (owner.role === 'shape') {
    return 'center';
  }
  const anchor = textNode?.getAttribute('text-anchor');
  if (anchor === 'middle') {
    return 'center';
  }
  return anchor === 'end' ? 'right' : 'left';
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
  const previousVisibility = textNode?.getAttribute('visibility') ?? null;
  const fill = textNode?.getAttribute('fill');
  const textarea = createTextEditor({
    text: originalText,
    rect,
    fontSize,
    fontFamily: textNode?.getAttribute('font-family') || 'sans-serif',
    inline: true,
    color: fill && fill !== 'none' ? fill : undefined,
    fontWeight: textNode?.getAttribute('font-weight') ?? undefined,
    fontStyle: textNode?.getAttribute('font-style') ?? undefined,
    align: textAlign(owner, textNode),
  });
  textNode?.setAttribute('visibility', 'hidden');

  return new ActiveTextEditor({
    textarea,
    originalText,
    commit: text => emitter.emit('textChange', { owner, text }),
    unbindAutoGrow: bindTextareaAutoGrow(textarea, Math.max(rect.height, fontSize * 1.6)),
    onClose: () => {
      if (textNode?.isConnected) {
        if (previousVisibility === null) {
          textNode.removeAttribute('visibility');
        } else {
          textNode.setAttribute('visibility', previousVisibility);
        }
      }
      onClose();
    },
  });
}
