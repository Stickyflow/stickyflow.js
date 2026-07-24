// Double-click inline text editing, layered on top of an existing Viewer.
// (DOM code — browser-verified, like viewer/interaction.ts and display.ts.)
import type { Viewer, OwnerRef } from '../viewer';
import { resolveOwner } from '../viewer/contract';
import { findOwnerNode, screenRectOf, isPrimary, isTextLabel } from '../viewer/domQuery';
import { Emitter } from './events';

export interface TextEditingHandle {
  destroy(): void;
}

const EDITABLE_ROLES = new Set(['entity', 'link']);

export function bindTextEditing(viewer: Viewer, emitter: Emitter): TextEditingHandle {
  const svg = viewer.svg;

  // Overlays a <textarea> on document.body (not inside the svg, so its keydown
  // never bubbles into the viewer's own Escape-clears-selection handler)
  // positioned via getBBox()+getScreenCTM(), which accounts for the current
  // pan/zoom automatically. The renderer's own text stays untouched: this
  // only emits `textChange` on commit — "model mutation" is a host concern.
  let activeEdit: { cleanup: () => void } | null = null;
  const endEdit = () => activeEdit?.cleanup();

  const beginEdit = (owner: OwnerRef) => {
    endEdit();
    const textNode = findOwnerNode(svg, owner.id, isTextLabel);
    const primaryNode = findOwnerNode(svg, owner.id, isPrimary);
    const anchor = textNode ?? primaryNode;
    if (!anchor) return;
    const currentText = textNode?.textContent ?? '';
    // A link's own path bbox spans its whole route, not just the label spot —
    // when it has no label yet, center a modest box on the path's midpoint
    // instead of overlaying the entire line.
    const rect = textNode
      ? screenRectOf(textNode)
      : owner.role === 'link'
        ? (() => {
            const full = screenRectOf(primaryNode!);
            const cx = full.left + full.width / 2, cy = full.top + full.height / 2;
            return { left: cx - 60, top: cy - 14, width: 120, height: 28 };
          })()
        : screenRectOf(primaryNode!);

    const textarea = document.createElement('textarea');
    textarea.value = currentText;
    const style = textarea.style;
    style.position = 'fixed';
    style.left = `${rect.left}px`; style.top = `${rect.top}px`;
    style.width = `${Math.max(rect.width, 40)}px`; style.height = `${Math.max(rect.height, 24)}px`;
    style.font = '14px sans-serif'; style.lineHeight = '1.2'; style.color = '#0f172a'; style.background = '#ffffff';
    style.border = '1px solid #9b42df'; style.borderRadius = '2px'; style.padding = '1px 2px';
    style.resize = 'none'; style.boxSizing = 'border-box'; style.zIndex = '1000';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const cleanup = () => {
      textarea.removeEventListener('keydown', onEditKeyDown);
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
      if (ke.key === 'Escape') { ke.preventDefault(); cancel(); }
      else if (ke.key === 'Enter' && !ke.shiftKey) { ke.preventDefault(); commit(); }
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
