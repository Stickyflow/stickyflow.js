// stickyflow — public surface of the vertical slice.
//
// Goal of this slice: prove the SFL parser + render-scene + SVG pipeline runs
// headless (Node, no DOM, no Konva, no React), consuming the real app source.
// The interactive viewer, web component and packaging split follow later.

// SFL core (re-exported from the app package — same single implementation).
export { parse, canonicalize, sflToCanvasState, sflToImportJson } from './sfl';

// Render pipeline.
export { render, renderCanvas } from './render';
export type { RenderResult, RenderOptions } from './render';
export { sflToRenderInput } from './sflToRenderInput';

// Render-scene contract types (now owned by this package).
export type {
  RenderScene, RenderNode, RenderInput, RenderDiagnostic, Bounds, Point, SceneRole,
} from './rendering/renderScene';
// Versioned interactive DOM contract shared by renderer and (future) viewer.
export { DOM_CONTRACT_VERSION } from './rendering/renderScene';
