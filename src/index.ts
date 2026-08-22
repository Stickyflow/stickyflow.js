// stickyflow — static tier: parse SFL and render it to SVG, headless.
//
// This entry is framework-free and DOM-free (Node, no Konva, no React): a docs
// site or SSR pipeline uses only this. Interaction lives in `stickyflow/viewer`,
// drop-in embedding in `stickyflow/web-component`.

// ── Primary API ───────────────────────────────────────────────────────────
/** Render SFL text straight to an SVG string. */
export { render, renderCanvas } from './render';
export type { RenderResult, RenderOptions } from './render';
/** Optional real-glyph-metrics injection for `RenderOptions.measureText` —
 *  see that field for when to use it instead of the built-in heuristic. */
export type { TextMetrics, MeasureTextFactory } from './model/geometry/text';
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
export type { SflCanvasState, SflEntityOut, SflLinkOut, SflGroupOut } from './sfl';
export { sflToRenderInput } from './sflToRenderInput';

/** Every valid `shape:` value (as a real, iterable runtime array — `ShapeType`
 *  itself only exists at compile time) — for hosts building a shape picker or
 *  similar UI that needs the canonical, always-current list. */
export { SHAPE_TYPES } from './model/shapes';
export type { ShapeType } from './model/shapes';
export type { FreeformPath, PathPoint } from './model/paths';
/** Every valid Chart `type:` value as a runtime array — the chart counterpart
 *  to SHAPE_TYPES above. Anything outside it renders as a plain series plot
 *  and reports an `unsupported-chart-type` diagnostic. */
export { CHART_TYPES } from './model/charts';
export type { Chart, ChartAxis, ChartSeries, ChartType, ChartRamp } from './model/charts';
