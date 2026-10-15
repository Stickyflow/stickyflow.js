export type { DiagramConfig } from './config';
export { StickyflowDiagram } from './element';

import { StickyflowDiagram } from './element';

export function defineStickyflowDiagram(tagName = 'stickyflow-diagram'): void {
  if (typeof customElements === 'undefined') {
    return;
  }
  if (!customElements.get(tagName)) {
    customElements.define(tagName, StickyflowDiagram);
  }
}
