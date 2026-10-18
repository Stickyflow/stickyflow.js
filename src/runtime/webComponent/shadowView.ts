import { createBindingRuntime } from '../../binding';
import { render } from '../../render';
import { connectInteraction, createViewer, type Viewer } from '../viewer';
import type { DiagramConfig } from './config';

const SHADOW_STYLE = `
  :host { display: block; position: relative; }
  .sf-container { width: 100%; height: 100%; }
  svg { display: block; max-width: 100%; }
  .sf-error { color: #b91c1c; font: 13px/1.4 system-ui, sans-serif; padding: 8px; white-space: pre-wrap; }
  [data-sf-role="entity"], [data-sf-role="link"] { cursor: pointer; }
  [data-sf-selected] { stroke: #2563eb !important; stroke-width: 4 !important; }
`;

export interface ShadowDiagramMount {
  viewer: Viewer | null;
  rendered: boolean;
  dispose: () => void;
}

const NOTHING = () => {};

function createShadowContainer(root: ShadowRoot): HTMLDivElement {
  const style = document.createElement('style');
  style.textContent = SHADOW_STYLE;
  const container = document.createElement('div');
  container.className = 'sf-container';
  root.append(style, container);
  return container;
}

function showRenderError(container: HTMLDivElement, error: unknown): void {
  const box = document.createElement('div');
  box.className = 'sf-error';
  box.textContent = `stickyflow: ${(error as Error).message ?? error}`;
  container.replaceChildren(box);
}

function bindSources(viewer: Viewer, source: string, config: DiagramConfig): () => void {
  const sources = Object.entries(config.dataSources ?? {});
  if (sources.length === 0) {
    return NOTHING;
  }
  const runtime = createBindingRuntime(source, { renderOptions: { padding: config.padding } });
  const unregister = sources
    .filter(([name]) => runtime.graph.contracts.has(name))
    .map(([name, dataSource]) => runtime.registerSource(name, dataSource));
  const detach = runtime.attach(viewer);
  const disconnect = connectInteraction(viewer, runtime);
  return () => {
    disconnect();
    detach();
    for (const off of unregister) {
      off();
    }
  };
}

function mountInteractiveDiagram(
  container: HTMLDivElement,
  source: string,
  config: DiagramConfig,
): { viewer: Viewer; dispose: () => void } {
  const viewer = createViewer({
    container,
    source,
    interactive: true,
    diagramId: config.diagramId,
    renderOptions: { padding: config.padding },
  });
  return { viewer, dispose: bindSources(viewer, source, config) };
}

function mountStaticDiagram(container: HTMLDivElement, source: string, config: DiagramConfig): void {
  container.innerHTML = render(source, { padding: config.padding }).svg;
}

export function mountShadowDiagram(root: ShadowRoot, config: DiagramConfig): ShadowDiagramMount {
  const container = createShadowContainer(root);
  if (config.source === null) {
    return { viewer: null, rendered: false, dispose: NOTHING };
  }

  try {
    if (!config.interactive) {
      mountStaticDiagram(container, config.source, config);
      return { viewer: null, rendered: true, dispose: NOTHING };
    }
    const { viewer, dispose } = mountInteractiveDiagram(container, config.source, config);
    return { viewer, rendered: true, dispose };
  } catch (error) {
    showRenderError(container, error);
    return { viewer: null, rendered: false, dispose: NOTHING };
  }
}
