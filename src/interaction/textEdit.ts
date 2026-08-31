import type { OwnerRef, Viewer } from '../viewer';
import { resolveOwner } from '../viewer/contract';
import { findOwnerNode, isPrimary, isTextLabel, screenRectOf } from '../viewer/domQuery';
import type { Emitter } from './events';

export interface TextEditingHandle {
  destroy(): void;
}

const EDITABLE_ROLES = new Set(['entity', 'link']);

export function bindTextEditing(viewer: Viewer, emitter: Emitter): TextEditingHandle {
  const svg = viewer.svg;

  let activeEdit: { cleanup: () => void } | null = null;
  const endEdit = () => activeEdit?.cleanup();

  const beginEdit = (owner: OwnerRef) => {
    endEdit();
    const textNode = findOwnerNode(svg, owner.id, isTextLabel);
    const primaryNode = findOwnerNode(svg, owner.id, isPrimary);
    const anchor = textNode ?? primaryNode;
    if (!anchor) return;
    const currentText = textNode?.textContent ?? '';
    const rect =
      owner.role === 'entity'
        ? screenRectOf(primaryNode!)
        : textNode
          ? screenRectOf(textNode)
          : (() => {
              const full = screenRectOf(primaryNode!);
              const cx = full.left + full.width / 2,
                cy = full.top + full.height / 2;
              return { left: cx - 60, top: cy - 14, width: 120, height: 28 };
            })();

    const fontSize = parseFloat(textNode?.getAttribute('font-size') || '14');
    const fontFamily = textNode?.getAttribute('font-family') || 'sans-serif';

    const textarea = document.createElement('textarea');
    textarea.value = currentText;
    const style = textarea.style;
    style.position = 'fixed';
    style.left = `${rect.left}px`;
    style.top = `${rect.top}px`;
    style.width = `${Math.max(rect.width, 60)}px`;
    style.height = `${Math.max(rect.height, fontSize * 1.6)}px`;
    style.font = `${fontSize}px ${fontFamily}`;
    style.lineHeight = '1.3';
    style.color = '#0f172a';
    style.background = '#ffffff';
    style.border = '1px solid #9b42df';
    style.borderRadius = '2px';
    style.padding = '4px 6px';
    style.resize = 'none';
    style.boxSizing = 'border-box';
    style.zIndex = '1000';
    style.overflow = 'hidden';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const minHeight = Math.max(rect.height, fontSize * 1.6);
    const autoGrow = () => {
      style.height = `${minHeight}px`;
      style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, 300))}px`;
    };
    textarea.addEventListener('input', autoGrow);
    autoGrow();

    const cleanup = () => {
      textarea.removeEventListener('keydown', onEditKeyDown);
      textarea.removeEventListener('input', autoGrow);
      textarea.removeEventListener('blur', commit);
      textarea.remove();
      activeEdit = null;
    };
    const commit = () => {
      const text = textarea.value;
      cleanup();
      if (text !== currentText) emitter.emit('textChange', { owner, text });
    };
    const cancel = () => cleanup();
    const onEditKeyDown = (ke: KeyboardEvent) => {
      if (ke.key === 'Escape') {
        ke.preventDefault();
        cancel();
      } else if (ke.key === 'Enter' && !ke.shiftKey) {
        ke.preventDefault();
        commit();
      }
    };
    textarea.addEventListener('keydown', onEditKeyDown);
    textarea.addEventListener('blur', commit);
    activeEdit = { cleanup };
  };

  const onDoubleClick = (e: MouseEvent) => {
    const owner = resolveOwner(e.target as Element | null);
    if (!owner || !EDITABLE_ROLES.has(owner.role)) return;
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
