import { type RenderOptions, render } from '../render';
import { isContractCompatible, parseContractVersion } from './contract';
import { type DisplayHandle, mountDisplay, type ViewBox } from './display';
import { Emitter, type OwnerRef, type Unsubscribe, type ViewerEventHandler, type ViewerEventName } from './events';
import { bindInteraction, type InteractionHandle } from './interaction';

export interface ViewerOptions {
  container: HTMLElement;
  source?: string;
  svg?: string;
  interactive?: boolean;
  selectable?: boolean;
  diagramId?: string;
  renderOptions?: RenderOptions;
}

export interface ViewerSource {
  source?: string;
  svg?: string;
  renderOptions?: RenderOptions;
  resetView?: boolean;
}

export interface Viewer {
  readonly svg: SVGSVGElement;
  on<T extends ViewerEventName>(name: T, handler: ViewerEventHandler<T>): Unsubscribe;
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  fit(): void;
  getViewport(): ViewBox;
  update(next: ViewerSource): void;
  destroy(): void;
}

export function createViewer(options: ViewerOptions): Viewer {
  const diagramId = options.diagramId ?? 'diagram';
  const emitter = new Emitter();

  const resolveSvg = (next: ViewerSource): string => {
    const svgString =
      next.svg ?? (next.source != null ? render(next.source, next.renderOptions ?? options.renderOptions).svg : null);
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
    interaction = options.interactive
      ? bindInteraction(display, emitter, diagramId, { selectable: options.selectable })
      : null;
  };

  mount(resolveSvg(options));

  queueMicrotask(() => emitter.emit('ready', { diagramId }));

  return {
    get svg() {
      return display.svg;
    },
    on: (name, handler) => emitter.on(name, handler),
    getSelection: () => interaction?.getSelection() ?? [],
    select: ids => interaction?.select(ids),
    fit: () => display.fit(),
    getViewport: () => display.getViewport(),
    update(next) {
      const svgString = resolveSvg(next);
      const version = parseContractVersion(svgString);
      if (!isContractCompatible(version)) {
        throw new Error(
          `viewer.update: incompatible DOM contract (svg=${version}). Renderer and viewer versions differ.`,
        );
      }
      display.updateContent(svgString);
      if (next.resetView) display.fit();
      const stillSelected = interaction?.getSelection() ?? [];
      if (stillSelected.length) interaction?.select(stillSelected.map(o => o.id));
    },
    destroy() {
      interaction?.destroy();
      display.destroy();
      emitter.clear();
    },
  };
}

export type { ViewBox } from './display';
export type {
  Modifiers,
  OwnerPointerEvent,
  OwnerRef,
  SelectionChangeEvent,
  Unsubscribe,
  ViewerErrorEvent,
  ViewerEventHandler,
  ViewerEventMap,
  ViewerEventName,
} from './events';
