// Public INTERACTION entry (import 'stickyflow/viewer'). Composes the static
// display with an optional interaction layer. Depends on the static core
// (../render) — never the other way round; that one-way rule is the separation
// between the docs/display tier and the interaction tier.
import { render, type RenderOptions } from '../render';
import { mountDisplay, type DisplayHandle } from './display';
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
}

export interface Viewer {
  readonly svg: SVGSVGElement;
  on<T extends ViewerEventName>(name: T, handler: ViewerEventHandler<T>): Unsubscribe;
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  fit(): void;
  /**
   * Swap in a freshly-rendered diagram (new SFL source or svg string) — e.g.
   * after `stickyflow/interaction` reports an edit the host accepted. The
   * viewer never mutates its own model, so this is how a host reflects a
   * change back. Resets camera and selection, same as mounting a new diagram.
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
    update(next) {
      const svgString = resolveSvg(next);
      interaction?.destroy();
      display.destroy();
      mount(svgString);
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
  OwnerPointerEvent, SelectionChangeEvent, ViewerErrorEvent, ViewerEventMap, Modifiers,
} from './events';
