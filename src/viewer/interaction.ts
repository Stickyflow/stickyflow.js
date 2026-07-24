// INTERACTION layer: wires DOM input events on top of the static display, using
// the pure contract/selection/event helpers. This is the only place with event
// listeners; display.ts stays a listener-free camera. (DOM code — verify in a
// browser.) Model mutation (tier 2b) will attach here later as applyOp().
import type { DisplayHandle } from './display';
import { resolveOwner } from './contract';
import { selectionReducer, clickAction } from './selection';
import { Emitter, type OwnerRef } from './events';

export interface InteractionHandle {
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  destroy(): void;
}

const DRAG_THRESHOLD = 4;
const EDITABLE_ROLES = new Set(['entity', 'link']);

/** Owner's screen-space rect to overlay an edit input on, in viewport pixels. */
function screenRectOf(el: SVGGraphicsElement): { left: number; top: number; width: number; height: number } {
  const bbox = el.getBBox();
  const ctm = el.getScreenCTM();
  if (!ctm) return { left: 0, top: 0, width: 0, height: 0 };
  const topLeft = new DOMPoint(bbox.x, bbox.y).matrixTransform(ctm);
  const bottomRight = new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height).matrixTransform(ctm);
  return { left: topLeft.x, top: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y };
}

function findOwnerNode(svg: SVGSVGElement, id: string, predicate: (el: Element) => boolean): SVGGraphicsElement | null {
  const nodes = svg.querySelectorAll(`[data-sf-id="${CSS.escape(id)}"]`);
  for (const el of nodes) if (predicate(el)) return el as unknown as SVGGraphicsElement;
  return null;
}

export function bindInteraction(display: DisplayHandle, emitter: Emitter, diagramId: string): InteractionHandle {
  const svg = display.svg;
  let selection = new Set<string>();
  const owners = new Map<string, OwnerRef>();

  const paintSelection = () => {
    // Only the primary node per owner (data-sf-primary — see buildRenderScene's
    // tag()) gets the selection attribute, not every sub-node sharing the
    // owner's sfId. Painting all of them applied the selection style (a
    // stroke override, see SflDiagram.css) to text labels too — glyphs aren't
    // meant to be stroked, so a selected entity's own label rendered as a
    // disfigured blob instead of a clean highlight on the shape itself.
    svg.querySelectorAll('[data-sf-selected]').forEach(el => el.removeAttribute('data-sf-selected'));
    selection.forEach(id => svg.querySelectorAll(`[data-sf-id="${CSS.escape(id)}"][data-sf-primary]`)
      .forEach(el => el.setAttribute('data-sf-selected', 'true')));
  };

  const setSelection = (next: Set<string>) => {
    selection = next;
    paintSelection();
    emitter.emit('selectionChange', {
      diagramId,
      selection: [...selection].map(id => owners.get(id)).filter((o): o is OwnerRef => !!o),
    });
  };

  const modifiersOf = (e: MouseEvent | KeyboardEvent) => ({ shift: e.shiftKey, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey });

  // --- selection + click ---------------------------------------------------
  let down: { x: number; y: number; moved: boolean } | null = null;

  const onPointerDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, moved: false }; };

  const onPointerMove = (e: PointerEvent) => {
    if (down) {
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_THRESHOLD) down.moved = true;
      if (down.moved) { display.panBy(e.movementX, e.movementY); return; }
    }
    const owner = resolveOwner(e.target as Element | null);
    emitter.emit('ownerHover', owner ? { diagramId, owner, modifiers: modifiersOf(e) } : { diagramId, owner: null });
  };

  const onPointerUp = (e: PointerEvent) => {
    const wasDrag = down?.moved ?? false;
    down = null;
    if (wasDrag) return;
    const owner = resolveOwner(e.target as Element | null);
    if (!owner) { setSelection(selectionReducer(selection, { type: 'clear' })); return; }
    owners.set(owner.id, owner);
    setSelection(selectionReducer(selection, clickAction(owner.id, modifiersOf(e))));
    emitter.emit(owner.role === 'link' ? 'linkClick' : 'entityClick', { diagramId, owner, modifiers: modifiersOf(e) });
  };

  // --- wheel zoom ----------------------------------------------------------
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    display.zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY);
  };

  // --- keyboard ------------------------------------------------------------
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setSelection(selectionReducer(selection, { type: 'clear' }));
  };

  // --- inline text edit (double-click) --------------------------------------
  // Overlays a <textarea> on document.body (not inside the svg, so its keydown
  // never bubbles into onKeyDown above) positioned via getBBox()+getScreenCTM(),
  // which accounts for the current pan/zoom automatically. The renderer's own
  // text stays untouched: this only emits `textChange` on commit (see events.ts)
  // — "model mutation" is a host concern, not this layer's.
  let activeEdit: { cleanup: () => void } | null = null;
  const endEdit = () => activeEdit?.cleanup();

  const beginEdit = (owner: OwnerRef) => {
    endEdit();
    const textNode = findOwnerNode(svg, owner.id, el => el.tagName.toLowerCase() === 'text' && !el.hasAttribute('data-sf-primary'));
    const primaryNode = findOwnerNode(svg, owner.id, el => el.hasAttribute('data-sf-primary'));
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
      if (text !== currentText) emitter.emit('textChange', { diagramId, owner, text });
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
    owners.set(owner.id, owner);
    beginEdit(owner);
  };

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('keydown', onKeyDown);
  svg.addEventListener('dblclick', onDoubleClick);

  return {
    getSelection: () => [...selection].map(id => owners.get(id)).filter((o): o is OwnerRef => !!o),
    select(ids) {
      ids.forEach(id => { const el = svg.querySelector(`[data-sf-id="${CSS.escape(id)}"]`); if (el) owners.set(id, resolveOwner(el)!); });
      setSelection(selectionReducer(selection, { type: 'set', ids }));
    },
    destroy() {
      endEdit();
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('keydown', onKeyDown);
      svg.removeEventListener('dblclick', onDoubleClick);
    },
  };
}
