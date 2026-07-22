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
  diagramId?: string;
  renderOptions?: RenderOptions;
}

export interface Viewer {
  readonly svg: SVGSVGElement;
  on<T extends ViewerEventName>(name: T, handler: ViewerEventHandler<T>): Unsubscribe;
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  fit(): void;
  destroy(): void;
}

export function createViewer(options: ViewerOptions): Viewer {
  const diagramId = options.diagramId ?? 'diagram';
  const emitter = new Emitter();

  const svgString = options.svg ?? (options.source != null ? render(options.source, options.renderOptions).svg : null);
  if (svgString == null) throw new Error('createViewer: provide either `source` (SFL) or `svg`.');

  const version = parseContractVersion(svgString);
  if (!isContractCompatible(version)) {
    throw new Error(`createViewer: incompatible DOM contract (svg=${version}). Renderer and viewer versions differ.`);
  }

  const display: DisplayHandle = mountDisplay(options.container, svgString);
  const interaction: InteractionHandle | null = options.interactive
    ? bindInteraction(display, emitter, diagramId)
    : null;

  // ready fires after the caller has had a chance to attach on('ready').
  queueMicrotask(() => emitter.emit('ready', { diagramId }));

  return {
    svg: display.svg,
    on: (name, handler) => emitter.on(name, handler),
    getSelection: () => interaction?.getSelection() ?? [],
    select: (ids) => interaction?.select(ids),
    fit: () => display.fit(),
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
