// Public entry for the web-component tier (import 'stickyflow/web-component').
// Registration is an explicit call, not an import side effect, so bundlers can
// tree-shake it and hosts control the tag name.
export { StickyflowDiagram } from './element';
export type { DiagramConfig } from './config';

import { StickyflowDiagram } from './element';

/** Register <stickyflow-diagram> (idempotent). Call once in the browser. */
export function defineStickyflowDiagram(tagName = 'stickyflow-diagram'): void {
  if (!customElements.get(tagName)) customElements.define(tagName, StickyflowDiagram);
}
