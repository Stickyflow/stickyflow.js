import {
  CHANGE_COLOR,
  FLASH_DURATION_MS,
  findOwnerNode,
  isPrimary,
  linkChangeOverlay,
  REDUCED_MOTION_DURATION_MS,
  shapeChangeOverlay,
  startChangeFade,
} from '../../domContract';

export interface ChangeFlash {
  /** Flash a ring/halo around each given owner id. Ids that do not resolve to
   *  a live primary node (already gone by the time this runs) are silently
   *  skipped, not an error. `color` overrides changeOverlay's CHANGE_COLOR. */
  flash(ownerIds: readonly string[], color?: string): void;
  destroy(): void;
}

export function createChangeFlash(svg: SVGSVGElement): ChangeFlash {
  // Pending removal timers keyed by owner id — a second flash landing on the
  // same id before the first timer fires cancels the stale timer instead of
  // racing it.
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const flash = (ownerIds: readonly string[], color: string = CHANGE_COLOR): void => {
    const ids = [...new Set(ownerIds)];
    if (ids.length === 0) {
      return;
    }
    const doc = svg.ownerDocument;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    for (const id of ids) {
      const primary = findOwnerNode(svg, id, isPrimary);
      if (!primary) {
        continue;
      }
      const pending = timers.get(id);
      if (pending) {
        clearTimeout(pending);
      }
      for (const stale of svg.querySelectorAll(`[data-sf-change-overlay="${CSS.escape(id)}"]`)) {
        stale.remove();
      }
      const overlay =
        primary.getAttribute('data-sf-role') === 'link'
          ? linkChangeOverlay(doc, primary as unknown as SVGPathElement, id, color)
          : shapeChangeOverlay(doc, primary, id, color);
      svg.appendChild(overlay);
      // After appending, not inside the builder — see startChangeFade's doc.
      startChangeFade(overlay, reducedMotion);
      const duration = reducedMotion ? REDUCED_MOTION_DURATION_MS : FLASH_DURATION_MS;
      // Closes over this specific overlay element, not a re-query at fire
      // time — a later flash on the same id already removed and replaced it.
      timers.set(
        id,
        setTimeout(() => {
          overlay.remove();
          timers.delete(id);
        }, duration),
      );
    }
  };

  return {
    flash,
    destroy(): void {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    },
  };
}
