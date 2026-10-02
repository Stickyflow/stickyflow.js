import { render } from '../../render';
import { createViewer, type Viewer } from '../viewer';
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
}

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

function mountInteractiveDiagram(container: HTMLDivElement, source: string, config: DiagramConfig): Viewer {
  return createViewer({
    container,
    source,
    interactive: true,
    diagramId: config.diagramId,
    renderOptions: { padding: config.padding },
  });
}

function mountStaticDiagram(container: HTMLDivElement, source: string, config: DiagramConfig): void {
  container.innerHTML = render(source, { padding: config.padding }).svg;
}

export function mountShadowDiagram(root: ShadowRoot, config: DiagramConfig): ShadowDiagramMount {
  const container = createShadowContainer(root);
  if (config.source === null) {
    return { viewer: null, rendered: false };
  }

  try {
    const viewer = config.interactive ? mountInteractiveDiagram(container, config.source, config) : null;
    if (!config.interactive) {
      mountStaticDiagram(container, config.source, config);
    }
    return { viewer, rendered: true };
  } catch (error) {
    showRenderError(container, error);
    return { viewer: null, rendered: false };
  }
}
