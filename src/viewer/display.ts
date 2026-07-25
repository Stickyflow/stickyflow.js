// STATIC display layer of the viewer: put the SVG on screen and move the camera.
// No model, no selection, no events — a docs page could use just this. Everything
// interactive lives in interaction.ts. (DOM code — verify in a browser.)

export interface ViewBox { x: number; y: number; w: number; h: number }

export interface DisplayHandle {
  readonly svg: SVGSVGElement;
  /** Reset the camera to the diagram's natural bounds. */
  fit(): void;
  /** Zoom around a client point (defaults to viewport centre). factor>1 zooms in. */
  zoomBy(factor: number, clientX?: number, clientY?: number): void;
  /** Pan by a pixel delta. */
  panBy(dxPixels: number, dyPixels: number): void;
  /**
   * Patches the diagram content into the SAME root `<svg>` element — a keyed
   * diff by each node's stable id (see patchSceneNodes in display.ts), not a
   * full remove-everything-and-reappend: an edit to one shape only touches
   * that shape's own attributes plus whatever else genuinely changed,
   * instead of re-laying-out and re-painting the whole diagram's DOM
   * subtree for every commit. Never replaces the root element itself, and
   * never touches the current viewBox — the camera is left exactly where it
   * was; call fit() after if you want the new content's natural bounds
   * instead. Deliberately not a destroy+remount either way: anything holding
   * a reference to `svg` — including `stickyflow/interaction`'s own event
   * listeners, bound once when a host calls bindEditing() — would otherwise
   * be left attached to a removed element after the very first update(),
   * silently going dead.
   */
  updateContent(svgString: string): void;
  destroy(): void;
}

function parseSvg(svgString: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const root = doc.documentElement as unknown as SVGSVGElement;
  if (root.nodeName.toLowerCase() !== 'svg') throw new Error('viewer: source did not parse to an <svg> root');
  return root;
}

function readViewBox(svg: SVGSVGElement): ViewBox {
  const raw = (svg.getAttribute('viewBox') ?? '0 0 100 100').split(/\s+/).map(Number);
  return { x: raw[0], y: raw[1], w: raw[2], h: raw[3] };
}

// Attributes the camera owns on the live <svg> — never overwritten by a
// content swap, since they encode view state (or DOM plumbing) rather than
// anything the renderer's own output should dictate after the first mount.
const CAMERA_OWNED_ATTRS = new Set(['viewbox', 'width', 'height']);

function patchAttributes(current: Element, next: Element): void {
  Array.from(current.attributes).forEach(attr => { if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name); });
  Array.from(next.attributes).forEach(attr => { if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value); });
}

/**
 * Patches the live `<svg>`'s content to match `next`, touching only what
 * differs — a keyed diff by each node's stable `id` (unchanged across
 * renders unless the entity itself is deleted — see renderSceneToSvg.ts's
 * Defs.elementId), not a full remove-everything-and-reappend. Order is
 * preserved (SVG paint order IS document order, and a changed `order` in
 * SFL can genuinely reorder which node paints on top) via the same
 * single-pass "insertBefore only if not already in place" technique a
 * keyed-list reconciler uses — cheap when nothing moved, correct when
 * something did. `<defs>` is small (gradients/markers) and replaced
 * wholesale rather than diffed; not worth it for a handful of nodes.
 */
function patchSceneNodes(svg: SVGSVGElement, next: SVGSVGElement): void {
  const currentDefs = svg.querySelector(':scope > defs');
  const nextDefs = next.querySelector(':scope > defs');
  if (nextDefs) {
    if (currentDefs) currentDefs.replaceWith(nextDefs);
    else svg.insertBefore(nextDefs, svg.firstChild);
  } else {
    currentDefs?.remove();
  }

  const currentById = new Map<string, Element>();
  svg.querySelectorAll(':scope > [id]').forEach(el => currentById.set(el.id, el));
  const keep = new Set<string>();

  let prevSibling: Node | null = nextDefs ?? currentDefs ?? null;
  next.querySelectorAll(':scope > [id]').forEach(nextEl => {
    keep.add(nextEl.id);
    const currentEl = currentById.get(nextEl.id);
    let liveEl: Element;
    if (currentEl && currentEl.tagName === nextEl.tagName) {
      // Same owner, same node type — patch in place. A <text>'s tspans are
      // its whole content and cheap to just replace outright rather than
      // diff line-by-line.
      patchAttributes(currentEl, nextEl);
      if (nextEl.tagName.toLowerCase() === 'text') {
        while (currentEl.firstChild) currentEl.removeChild(currentEl.firstChild);
        while (nextEl.firstChild) currentEl.appendChild(nextEl.firstChild);
      }
      liveEl = currentEl;
    } else {
      // New id, or the same id switched node type (e.g. a shapeType change
      // that moved it from <rect> to <path>) — the freshly parsed node
      // already has the right attributes/children, just drop the old one.
      currentEl?.remove();
      liveEl = nextEl;
    }
    const wantedNext = prevSibling ? prevSibling.nextSibling : svg.firstChild;
    if (wantedNext !== liveEl) svg.insertBefore(liveEl, wantedNext);
    prevSibling = liveEl;
  });

  // Anything left in currentById wasn't in `next` at all — the entity was deleted.
  currentById.forEach((el, id) => { if (!keep.has(id)) el.remove(); });
}

/** Mount an SVG string into a container and return camera controls. */
export function mountDisplay(container: HTMLElement, svgString: string): DisplayHandle {
  const svg = parseSvg(svgString);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';
  svg.style.touchAction = 'none';

  let natural = readViewBox(svg);
  let view: ViewBox = { ...natural };

  const apply = () => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);

  const pxPerUnit = () => {
    const rect = svg.getBoundingClientRect();
    return rect.width > 0 ? rect.width / view.w : 1;
  };

  container.appendChild(svg);
  apply();

  return {
    svg,
    fit() { view = { ...natural }; apply(); },
    zoomBy(factor, clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      const cx = clientX ?? rect.left + rect.width / 2;
      const cy = clientY ?? rect.top + rect.height / 2;
      // Anchor: keep the world point under the cursor fixed while scaling.
      const wx = view.x + (cx - rect.left) / rect.width * view.w;
      const wy = view.y + (cy - rect.top) / rect.height * view.h;
      view = { w: view.w / factor, h: view.h / factor, x: 0, y: 0 } as ViewBox;
      view.x = wx - (cx - rect.left) / rect.width * view.w;
      view.y = wy - (cy - rect.top) / rect.height * view.h;
      apply();
    },
    panBy(dxPixels, dyPixels) {
      const scale = pxPerUnit();
      view.x -= dxPixels / scale;
      view.y -= dyPixels / scale;
      apply();
    },
    updateContent(nextSvgString) {
      const next = parseSvg(nextSvgString);
      Array.from(svg.attributes).forEach(attr => { if (!CAMERA_OWNED_ATTRS.has(attr.name.toLowerCase())) svg.removeAttribute(attr.name); });
      Array.from(next.attributes).forEach(attr => { if (!CAMERA_OWNED_ATTRS.has(attr.name.toLowerCase())) svg.setAttribute(attr.name, attr.value); });
      patchSceneNodes(svg, next);
      natural = readViewBox(next);
      // view/viewBox untouched on purpose — see the doc comment on this method.
    },
    destroy() { svg.remove(); },
  };
}
