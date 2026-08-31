export type { DiagramConfig } from './config';
export { StickyflowDiagram } from './element';

import { StickyflowDiagram } from './element';

export function defineStickyflowDiagram(tagName = 'stickyflow-diagram'): void {
  if (!customElements.get(tagName)) customElements.define(tagName, StickyflowDiagram);
}
