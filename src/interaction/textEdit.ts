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
    // An entity's edit box is the SHAPE's own footprint, not the text label's
    // tight bbox around just its current glyphs — "Valid?" inside a 160x100
    // diamond has a label bbox a fraction of that size, which used to cram
    // the whole editing experience into a sliver. A link's path bbox spans
    // its entire route rather than just the label spot, so it keeps using
    // the label's own bbox when one exists, or a modest box centered on the
    // path's midpoint when it doesn't have a label yet.
    const rect = owner.role === 'entity'
      ? screenRectOf(primaryNode!)
      : textNode
        ? screenRectOf(textNode)
        : (() => {
            const full = screenRectOf(primaryNode!);
            const cx = full.left + full.width / 2, cy = full.top + full.height / 2;
            return { left: cx - 60, top: cy - 14, width: 120, height: 28 };
          })();

    // The rendered label's own font — not a hardcoded size — so the edit box
    // isn't asked to fit a bigger font than what it was actually sized for
    // (the mismatch that forced the old fixed 14px into a scrollbar).
    const fontSize = parseFloat(textNode?.getAttribute('font-size') || '14');
    const fontFamily = textNode?.getAttribute('font-family') || 'sans-serif';

    const textarea = document.createElement('textarea');
    textarea.value = currentText;
    const style = textarea.style;
    style.position = 'fixed';
    style.left = `${rect.left}px`; style.top = `${rect.top}px`;
    style.width = `${Math.max(rect.width, 60)}px`; style.height = `${Math.max(rect.height, fontSize * 1.6)}px`;
    style.font = `${fontSize}px ${fontFamily}`; style.lineHeight = '1.3'; style.color = '#0f172a'; style.background = '#ffffff';
    style.border = '1px solid #9b42df'; style.borderRadius = '2px'; style.padding = '4px 6px';
    style.resize = 'none'; style.boxSizing = 'border-box'; style.zIndex = '1000';
    style.overflow = 'hidden';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    // Grow downward past the shape's own height rather than scrolling once
    // typed text no longer fits it — a resize handle exists for the shape
    // itself, but nothing lets you resize this overlay by hand.
    const minHeight = Math.max(rect.height, fontSize * 1.6);
    const autoGrow = () => {
      style.height = `${minHeight}px`;
      style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, 300))}px`;
    };
    textarea.addEventListener('input', autoGrow);
    autoGrow(); // the existing text may already need more room than the shape's own box gives

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
