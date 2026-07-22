// stickyflow — static tier: parse SFL and render it to SVG, headless.
//
// This entry is framework-free and DOM-free (Node, no Konva, no React): a docs
// site or SSR pipeline uses only this. Interaction lives in `stickyflow/viewer`,
// drop-in embedding in `stickyflow/web-component`.

// ── Primary API ───────────────────────────────────────────────────────────
/** Render SFL text straight to an SVG string. */
export { render, renderCanvas } from './render';
export type { RenderResult, RenderOptions } from './render';
/** Parse SFL, and canonically re-emit it (idempotent). */
export { parse, canonicalize } from './sfl';

// ── Interactive DOM contract (shared with the viewer) ─────────────────────
export { DOM_CONTRACT_VERSION } from './rendering/renderScene';
export type {
  RenderScene, RenderNode, RenderInput, RenderDiagnostic, Bounds, Point, SceneRole,
} from './rendering/renderScene';

// ── Lower-level building blocks (advanced) ────────────────────────────────
// The staged pipeline behind render(): SFL → canvas state → v3 JSON →
// RenderInput. Exposed for tools that need an intermediate representation.
export { sflToCanvasState, sflToImportJson } from './sfl';
export { sflToRenderInput } from './sflToRenderInput';
