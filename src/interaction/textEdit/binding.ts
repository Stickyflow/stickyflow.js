import { findOwnerNode, isPrimary, isTextLabel, resolveOwner } from '../../domContract';
import type { OwnerRef, Viewer } from '../../viewer';
import type { Emitter } from '../events';
import { resolveTextEditRect } from './geometry';
import { bindTextareaAutoGrow, createTextEditor } from './textarea';

const EDITABLE_ROLES = new Set(['entity', 'link']);

export interface TextEditingHandle {
  destroy(): void;
}

function fontSizeOf(textNode: SVGGraphicsElement | null): number {
  return Number.parseFloat(textNode?.getAttribute('font-size') || '14');
}

export function bindTextEditing(viewer: Viewer, emitter: Emitter): TextEditingHandle {
  const svg = viewer.svg;
  let activeCleanup: (() => void) | null = null;

  const endEdit = (): void => {
    activeCleanup?.();
  };

  const beginEdit = (owner: OwnerRef): void => {
    endEdit();
    const textNode = findOwnerNode(svg, owner.id, isTextLabel);
    const primaryNode = findOwnerNode(svg, owner.id, isPrimary);
    const rect = resolveTextEditRect(owner, textNode, primaryNode);
    if (!rect) {
      return;
    }

    const currentText = textNode?.textContent ?? '';
    const fontSize = fontSizeOf(textNode);
    const textarea = createTextEditor({
      text: currentText,
      rect,
      fontSize,
      fontFamily: textNode?.getAttribute('font-family') || 'sans-serif',
    });
    const unbindAutoGrow = bindTextareaAutoGrow(textarea, Math.max(rect.height, fontSize * 1.6));

    const cleanup = (): void => {
      textarea.removeEventListener('keydown', onEditKeyDown);
      textarea.removeEventListener('blur', commit);
      unbindAutoGrow();
      textarea.remove();
      activeCleanup = null;
    };
    const commit = (): void => {
      const text = textarea.value;
      cleanup();
      if (text !== currentText) {
        emitter.emit('textChange', { owner, text });
      }
    };
    const cancel = (): void => {
      cleanup();
    };
    const onEditKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        commit();
      }
    };

    textarea.addEventListener('keydown', onEditKeyDown);
    textarea.addEventListener('blur', commit);
    activeCleanup = cleanup;
  };

  const onDoubleClick = (event: MouseEvent): void => {
    const owner = resolveOwner(event.target as Element | null);
    if (!owner || !EDITABLE_ROLES.has(owner.role)) {
      return;
    }
    beginEdit(owner);
  };

  svg.addEventListener('dblclick', onDoubleClick);

  return {
    destroy() {
      endEdit();
      svg.removeEventListener('dblclick', onDoubleClick);
    },
  };
}
