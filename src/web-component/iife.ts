// CDN / <script src> entry: self-registers <stickyflow-diagram> on load so a
// plain HTML page needs no bundler. Also exposed on the global (window.Stickyflow).
import { defineStickyflowDiagram, StickyflowDiagram } from './index';

defineStickyflowDiagram();

export { defineStickyflowDiagram, StickyflowDiagram };
