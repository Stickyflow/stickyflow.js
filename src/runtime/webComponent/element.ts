import type { Viewer } from '../viewer';
import { type DiagramConfig, OBSERVED_ATTRS, readConfig } from './config';
import { mountShadowDiagram } from './shadowView';

// Where there is no DOM, as on a server, the class is only a placeholder that is never made, and the cast says that it stands for the real one.
const ElementBase: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

export class StickyflowDiagram extends ElementBase {
  static get observedAttributes(): string[] {
    return [...OBSERVED_ATTRS];
  }

  private readonly root: ShadowRoot;
  private view: Viewer | null = null;
  private sourceProp: string | null = null;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.rerender();
  }

  disconnectedCallback(): void {
    this.teardown();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.rerender();
    }
  }

  set source(value: string | null) {
    this.sourceProp = value;
    if (this.isConnected) {
      this.rerender();
    }
  }

  get source(): string | null {
    return this.sourceProp ?? this.getAttribute('source');
  }

  get viewer(): Viewer | null {
    return this.view;
  }

  private config(): DiagramConfig {
    const config = readConfig(name => this.getAttribute(name));
    return { ...config, source: this.sourceProp ?? config.source };
  }

  private teardown(): void {
    this.view?.destroy();
    this.view = null;
    this.root.replaceChildren();
  }

  private rerender(): void {
    this.teardown();
    const config = this.config();
    const mount = mountShadowDiagram(this.root, config);
    this.view = mount.viewer;
    if (mount.rendered) {
      this.dispatchEvent(new CustomEvent('sf-render', { detail: { interactive: config.interactive } }));
    }
  }
}
