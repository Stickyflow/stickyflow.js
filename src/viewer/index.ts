// Public INTERACTION entry (import 'stickyflow/viewer'). Composes the static
// display with an optional interaction layer. Depends on the static core
// (../render) — never the other way round; that one-way rule is the separation
// between the docs/display tier and the interaction tier.
import { render, type RenderOptions } from '../render';
import { mountDisplay, type DisplayHandle, type ViewBox } from './display';
import { bindInteraction, type InteractionHandle } from './interaction';
import { parseContractVersion, isContractCompatible } from './contract';
import { Emitter, type OwnerRef, type ViewerEventName, type ViewerEventHandler, type Unsubscribe } from './events';

export interface ViewerOptions {
  container: HTMLElement;
  /** SFL source text to render, or… */
  source?: string;
  /** …a pre-rendered SVG string (from the static render()). One of the two. */
  svg?: string;
  /** Bind selection/hover/zoom/pan. Default false = static display only. */
  interactive?: boolean;
  /** Click-to-select and hover events. Default true. Pan/zoom stay on either
   *  way — set false for a navigation-only viewer with nothing to select. */
  selectable?: boolean;
  diagramId?: string;
  renderOptions?: RenderOptions;
}

/** Either form accepted by both the initial mount and update(): SFL source or a pre-rendered svg. */
export interface ViewerSource {
  source?: string;
  svg?: string;
  renderOptions?: RenderOptions;
  /** update() only: fit the camera to the new diagram's natural bounds instead
   *  of carrying over the reader's current pan/zoom (the default — see update()). */
  resetView?: boolean;
  /**
   * update() only: briefly flash a ring/halo around whichever shapes this
   * update actually added or changed (see display.ts's SceneDiff). Default
   * false — this is a shared library, so a new visual behavior must be
   * opted into per call rather than silently appearing for every existing
   * consumer's `update()` call. The `sceneDiff` event fires either way,
   * regardless of this flag, for a host that wants the raw diff without the
   * built-in visual. Pass `{ color }` instead of `true` to override the
   * default amber (changeOverlay.ts's CHANGE_COLOR) — e.g. a host that can
   * tell this particular update apart from an ordinary one (a bulk rewrite,
   * a specific known source) and wants a visually distinct flash for it.
   */
  highlightChanges?: boolean | { color?: string };
}

export interface Viewer {
  readonly svg: SVGSVGElement;
  on<T extends ViewerEventName>(name: T, handler: ViewerEventHandler<T>): Unsubscribe;
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  fit(): void;
  /** The camera's current view-space rectangle, in the diagram's own
   *  SFL/user-space units — e.g. to place a newly inserted entity centered
   *  on whatever the reader is currently looking at instead of at a fixed
   *  spot they'd then have to go find. */
  getViewport(): ViewBox;
  /**
   * Swap in a freshly-rendered diagram (new SFL source or svg string) — e.g.
   * after `stickyflow/interaction` reports an edit the host accepted. The
   * viewer never mutates its own model, so this is how a host reflects a
   * change back. Updates the SAME root svg element's content in place (never
   * replaces it), so the reader's current pan/zoom stays exactly where it
   * was and anything holding a live reference to `.svg` — including
   * `stickyflow/interaction`'s own event listeners — keeps working; pass
   * `resetView: true` to fit the new diagram's natural bounds instead (e.g.
   * when swapping to an unrelated one). Still-selected owners that exist in
   * the new content stay selected; ones that don't are dropped.
   */
  update(next: ViewerSource): void;
  destroy(): void;
}

export function createViewer(options: ViewerOptions): Viewer {
  const diagramId = options.diagramId ?? 'diagram';
  const emitter = new Emitter();

  const resolveSvg = (next: ViewerSource): string => {
    const svgString = next.svg ?? (next.source != null ? render(next.source, next.renderOptions ?? options.renderOptions).svg : null);
    if (svgString == null) throw new Error('createViewer: provide either `source` (SFL) or `svg`.');
    return svgString;
  };

  let display: DisplayHandle;
  let interaction: InteractionHandle | null;

  const mount = (svgString: string) => {
    const version = parseContractVersion(svgString);
    if (!isContractCompatible(version)) {
      throw new Error(`createViewer: incompatible DOM contract (svg=${version}). Renderer and viewer versions differ.`);
    }
    display = mountDisplay(options.container, svgString);
    interaction = options.interactive ? bindInteraction(display, emitter, diagramId, { selectable: options.selectable }) : null;
  };

  mount(resolveSvg(options));

  // ready fires after the caller has had a chance to attach on('ready').
  queueMicrotask(() => emitter.emit('ready', { diagramId }));

  return {
    get svg() { return display.svg; },
    on: (name, handler) => emitter.on(name, handler),
    getSelection: () => interaction?.getSelection() ?? [],
    select: (ids) => interaction?.select(ids),
    fit: () => display.fit(),
    getViewport: () => display.getViewport(),
    update(next) {
      const svgString = resolveSvg(next);
      const version = parseContractVersion(svgString);
      if (!isContractCompatible(version)) {
        throw new Error(`viewer.update: incompatible DOM contract (svg=${version}). Renderer and viewer versions differ.`);
      }
      const diff = display.updateContent(svgString);
      if (next.resetView) display.fit();
      // The old selection overlay was just wiped out along with the old
      // content — reusing select() (rather than a new API) both re-paints it
      // against the fresh DOM for owners that still exist, and drops any that
      // don't (findOwnerNode comes back null, paintSelection skips them).
      const stillSelected = interaction?.getSelection() ?? [];
      if (stillSelected.length) interaction?.select(stillSelected.map(o => o.id));
      emitter.emit('sceneDiff', { diagramId, ...diff });
      if (next.highlightChanges) {
        const color = typeof next.highlightChanges === 'object' ? next.highlightChanges.color : undefined;
        interaction?.flashChanged({ added: diff.added, changed: diff.changed }, color);
      }
    },
    destroy() {
      interaction?.destroy();
      display.destroy();
      emitter.clear();
    },
  };
}

export type { OwnerRef, ViewerEventName, ViewerEventHandler, Unsubscribe } from './events';
export type {
  OwnerPointerEvent, SelectionChangeEvent, SceneDiffEvent, ViewerErrorEvent, ViewerEventMap, Modifiers,
} from './events';
export type { ViewBox } from './display';
export type { SceneDiff } from './display';
