import type { DataSource } from '../../binding';
import type { Viewer } from '../viewer';
import { type DiagramConfig, OBSERVED_ATTRS, readConfig } from './config';
import { mountShadowDiagram } from './shadowView';

const ElementBase: typeof HTMLElement =
  typeof HTMLElement === 'undefined' ? (class {} as unknown as typeof HTMLElement) : HTMLElement;

export class StickyflowDiagram extends ElementBase {
  static get observedAttributes(): string[] {
    return [...OBSERVED_ATTRS];
  }

  private readonly root: ShadowRoot;
  private view: Viewer | null = null;
  private sourceProp: string | null = null;
  private dataSourcesProp: Record<string, DataSource> | null = null;
  private dispose: () => void = () => {};

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

  set dataSources(value: Record<string, DataSource> | null) {
    this.dataSourcesProp = value;
    if (this.isConnected) {
      this.rerender();
    }
  }

  get dataSources(): Record<string, DataSource> | null {
    return this.dataSourcesProp;
  }

  get viewer(): Viewer | null {
    return this.view;
  }

  private config(): DiagramConfig {
    const config = readConfig(name => this.getAttribute(name));
    return {
      ...config,
      source: this.sourceProp ?? config.source,
      dataSources: this.dataSourcesProp ?? undefined,
    };
  }

  private teardown(): void {
    this.dispose();
    this.dispose = () => {};
    this.view?.destroy();
    this.view = null;
    this.root.replaceChildren();
  }

  private rerender(): void {
    this.teardown();
    const config = this.config();
    const mount = mountShadowDiagram(this.root, config);
    this.view = mount.viewer;
    this.dispose = mount.dispose;
    if (mount.rendered) {
      this.dispatchEvent(new CustomEvent('sf-render', { detail: { interactive: config.interactive } }));
    }
  }
}
