// STATIC display layer of the viewer: put the SVG on screen and move the camera.
// No model, no selection, no events — a docs page could use just this. Everything
// interactive lives in interaction.ts. (DOM code — verify in a browser.)

export interface ViewBox { x: number; y: number; w: number; h: number }

export interface DisplayHandle {
  readonly svg: SVGSVGElement;
  /** Reset the camera to the diagram's natural bounds. */
  fit(): void;
  /** The current camera — the same view-space rectangle backing the live
   *  `<svg>`'s own viewBox, in the diagram's own SFL/user-space units. A host
   *  reading `svg.getAttribute('viewBox')` and splitting the string itself
   *  was the only way to get this before; this is that same rectangle,
   *  already parsed, and kept as this module's own in-memory source of truth
   *  rather than a re-read off the DOM. */
  getViewport(): ViewBox;
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
   *
   * Returns which owners were added/removed/changed by this patch (see
   * SceneDiff) — createViewer's update() forwards this as the `sceneDiff`
   * event and, when opted in, uses it to flash the touched shapes.
   */
  updateContent(svgString: string): SceneDiff;
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

/** Ids added/removed/changed by the last updateContent() call, at OWNER
 *  granularity (data-sf-id — a single owner is often several top-level SVG
 *  elements, e.g. a frame's body + tab + title text) rather than raw element
 *  id. Consumed by createViewer's `sceneDiff` event and change-highlighting. */
export interface SceneDiff { added: string[]; removed: string[]; changed: string[] }

/** An element's semantic owner id — data-sf-id for anything the renderer
 *  stamped with the interactive contract, else its own plain id (defs
 *  children and other non-owner nodes have no data-sf-id). */
function ownerIdOf(el: Element): string {
  return el.getAttribute('data-sf-id') ?? el.id;
}

function patchAttributes(current: Element, next: Element): boolean {
  let changed = false;
  Array.from(current.attributes).forEach(attr => {
    if (!next.hasAttribute(attr.name)) { current.removeAttribute(attr.name); changed = true; }
  });
  Array.from(next.attributes).forEach(attr => {
    if (current.getAttribute(attr.name) !== attr.value) { current.setAttribute(attr.name, attr.value); changed = true; }
  });
  return changed;
}

/** Node-for-node equality (tag, attributes, text) of two elements' children —
 *  checked before a <text> node's tspans get wholesale-replaced, so an
 *  unchanged label doesn't get reported as touched just because this branch
 *  used to replace unconditionally on every render. */
function childrenEqual(a: Element, b: Element): boolean {
  const aKids = Array.from(a.childNodes);
  const bKids = Array.from(b.childNodes);
  if (aKids.length !== bKids.length) return false;
  for (let i = 0; i < aKids.length; i++) {
    const x = aKids[i], y = bKids[i];
    if (x.nodeType !== y.nodeType) return false;
    if (x.nodeType === Node.TEXT_NODE) {
      if (x.textContent !== y.textContent) return false;
      continue;
    }
    if (x.nodeType !== Node.ELEMENT_NODE) continue;
    const xEl = x as Element, yEl = y as Element;
    if (xEl.tagName !== yEl.tagName) return false;
    if (xEl.attributes.length !== yEl.attributes.length) return false;
    for (const attr of Array.from(xEl.attributes)) {
      if (yEl.getAttribute(attr.name) !== attr.value) return false;
    }
    if (!childrenEqual(xEl, yEl)) return false;
  }
  return true;
}

/** Pure classification, no DOM — exported so it's unit-testable directly
 *  (see test/viewer-pure.test.ts) without needing a browser/jsdom to exercise
 *  patchSceneNodes itself. An owner only appears in the result if something
 *  about it was actually touched; a pure reorder (paint order changed, no
 *  attribute/content difference) never reaches touchedOwnerIds and so is
 *  correctly absent from all three lists. */
export function classifySceneDiff(oldOwnerIds: Set<string>, newOwnerIds: Set<string>, touchedOwnerIds: Set<string>): SceneDiff {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  touchedOwnerIds.forEach(id => {
    const wasPresent = oldOwnerIds.has(id);
    const isPresent = newOwnerIds.has(id);
    if (isPresent && !wasPresent) added.push(id);
    else if (wasPresent && !isPresent) removed.push(id);
    else if (wasPresent && isPresent) changed.push(id);
  });
  return { added, removed, changed };
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
function patchSceneNodes(svg: SVGSVGElement, next: SVGSVGElement): SceneDiff {
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

  const oldOwnerIds = new Set<string>();
  currentById.forEach(el => oldOwnerIds.add(ownerIdOf(el)));
  const newOwnerIds = new Set<string>();
  const touchedOwnerIds = new Set<string>();

  let prevSibling: Node | null = nextDefs ?? currentDefs ?? null;
  next.querySelectorAll(':scope > [id]').forEach(nextEl => {
    keep.add(nextEl.id);
    const ownerId = ownerIdOf(nextEl);
    newOwnerIds.add(ownerId);
    const currentEl = currentById.get(nextEl.id);
    let liveEl: Element;
    if (currentEl && currentEl.tagName === nextEl.tagName) {
      // Same owner, same node type — patch in place. A <text>'s tspans are
      // its whole content, so a real change replaces them outright rather
      // than diffing line-by-line — but only when they actually differ,
      // since the touched-owner classification below depends on that.
      const attrsChanged = patchAttributes(currentEl, nextEl);
      let contentChanged = false;
      if (nextEl.tagName.toLowerCase() === 'text' && !childrenEqual(currentEl, nextEl)) {
        contentChanged = true;
        while (currentEl.firstChild) currentEl.removeChild(currentEl.firstChild);
        while (nextEl.firstChild) currentEl.appendChild(nextEl.firstChild);
      }
      if (attrsChanged || contentChanged) touchedOwnerIds.add(ownerId);
      liveEl = currentEl;
    } else {
      // New id, or the same id switched node type (e.g. a shapeType change
      // that moved it from <rect> to <path>) — the freshly parsed node
      // already has the right attributes/children, just drop the old one.
      currentEl?.remove();
      liveEl = nextEl;
      touchedOwnerIds.add(ownerId);
    }
    const wantedNext = prevSibling ? prevSibling.nextSibling : svg.firstChild;
    if (wantedNext !== liveEl) svg.insertBefore(liveEl, wantedNext);
    prevSibling = liveEl;
  });

  // Anything left in currentById wasn't in `next` at all — the entity was deleted.
  currentById.forEach((el, id) => {
    if (!keep.has(id)) {
      touchedOwnerIds.add(ownerIdOf(el));
      el.remove();
    }
  });

  return classifySceneDiff(oldOwnerIds, newOwnerIds, touchedOwnerIds);
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
    getViewport() { return { ...view }; },
    zoomBy(factor, clientX, clientY) {
      const rect = svg.getBoundingClientRect();
      // A detached or not-yet-laid-out svg measures 0x0, and dividing by that
      // puts NaN into the viewBox — which does not merely stop the zoom, it
      // blanks the whole diagram with no error anywhere. Bail instead: there is
      // no meaningful anchor point on a box with no size. (pxPerUnit() below
      // already guards the same way for panning.)
      if (rect.width <= 0 || rect.height <= 0) return;
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
      const diff = patchSceneNodes(svg, next);
      natural = readViewBox(next);
      // view/viewBox untouched on purpose — see the doc comment on this method.
      return diff;
    },
    destroy() { svg.remove(); },
  };
}
