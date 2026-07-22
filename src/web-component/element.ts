// <stickyflow-diagram> custom element (plan §6.7). Top of the dependency chain:
// it composes the STATIC tier (render) and, only when `interactive`, the
// INTERACTION tier (viewer). Shadow DOM isolates styles from the host page.
// (DOM code — verify in a browser via demo/web-component.html.)
import { render } from '../render';
import { createViewer, type Viewer } from '../viewer';
import { readConfig, OBSERVED_ATTRS, type DiagramConfig } from './config';

const SHADOW_STYLE = `
  :host { display: block; position: relative; }
  .sf-container { width: 100%; height: 100%; }
  svg { display: block; max-width: 100%; }
  .sf-error { color: #b91c1c; font: 13px/1.4 system-ui, sans-serif; padding: 8px; white-space: pre-wrap; }
  [data-sf-role="entity"], [data-sf-role="link"] { cursor: pointer; }
  [data-sf-selected] { stroke: #2563eb !important; stroke-width: 4 !important; }
`;

export class StickyflowDiagram extends HTMLElement {
  static get observedAttributes(): string[] { return [...OBSERVED_ATTRS]; }

  private root: ShadowRoot;
  private view: Viewer | null = null;
  private sourceProp: string | null = null;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void { this.rerender(); }
  disconnectedCallback(): void { this.teardown(); }
  attributeChangedCallback(): void { if (this.isConnected) this.rerender(); }

  /** Property form for large SFL that shouldn't live in an HTML attribute. */
  set source(value: string | null) { this.sourceProp = value; if (this.isConnected) this.rerender(); }
  get source(): string | null { return this.sourceProp ?? this.getAttribute('source'); }

  /** The live viewer when interactive, else null. Lets a host bind events. */
  get viewer(): Viewer | null { return this.view; }

  private config(): DiagramConfig {
    const cfg = readConfig(name => this.getAttribute(name));
    return { ...cfg, source: this.sourceProp ?? cfg.source };
  }

  private teardown(): void {
    this.view?.destroy();
    this.view = null;
    this.root.replaceChildren();
  }

  private rerender(): void {
    this.teardown();
    const cfg = this.config();

    const style = document.createElement('style');
    style.textContent = SHADOW_STYLE;
    const container = document.createElement('div');
    container.className = 'sf-container';
    this.root.append(style, container);

    if (cfg.source == null) return;
    try {
      if (cfg.interactive) {
        this.view = createViewer({
          container, source: cfg.source, interactive: true,
          diagramId: cfg.diagramId, renderOptions: { padding: cfg.padding },
        });
      } else {
        container.innerHTML = render(cfg.source, { padding: cfg.padding }).svg;
      }
      this.dispatchEvent(new CustomEvent('sf-render', { detail: { interactive: cfg.interactive } }));
    } catch (error) {
      const box = document.createElement('div');
      box.className = 'sf-error';
      box.textContent = `stickyflow: ${(error as Error).message ?? error}`;
      container.replaceChildren(box);
    }
  }
}
