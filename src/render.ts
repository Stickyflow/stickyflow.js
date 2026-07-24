// Public render entry (plan §7). render() never touches the DOM: it is a pure
// SFL-text -> SVG-string transform, verified to run under Node (no jsdom).
import { buildRenderScene } from './rendering/buildRenderScene';
import { renderSceneToSvg } from './rendering/renderSceneToSvg';
import type {
  RenderInput, RenderScene, RenderDiagnostic,
} from './rendering/renderScene';
import { sflToRenderInput } from './sflToRenderInput';

export interface RenderResult {
  svg: string;
  width: number;
  height: number;
  diagnostics: RenderDiagnostic[];
  scene: RenderScene;
}

export interface RenderOptions {
  /** Extra space around the diagram bounds, in user units. Default 16. */
  padding?: number;
  /** Emit the leading <?xml …?> declaration. Default true. */
  includeXmlDeclaration?: boolean;
  /**
   * Prefix every raw SVG `id="…"` with this string. render() is deterministic
   * per call, so two renders that happen to share entity ids (e.g. both SFL
   * sources declare `Entity e`) produce identical ids — invisible for one
   * standalone SVG, but a real bug once multiple render() outputs sit in the
   * same HTML page: `url(#id)` resolves to whichever element with that id
   * comes first in the document, so a later diagram can silently render with
   * an earlier diagram's gradient/marker. Set a distinct idPrefix per diagram
   * when embedding more than one on a page. Does not affect `data-sf-id`,
   * which stays the plain SFL entity id for the interactive contract.
   */
  idPrefix?: string;
}

/** Render an already-built RenderInput to SVG. Headless and pure. */
export function renderCanvas(input: RenderInput, options: RenderOptions = {}): RenderResult {
  const scene = buildRenderScene(input);
  const { svg, width, height, diagnostics } = renderSceneToSvg(scene, options);
  return { svg, width, height, diagnostics, scene };
}

/** Render SFL source text straight to SVG. */
export function render(source: string, options: RenderOptions = {}): RenderResult {
  return renderCanvas(sflToRenderInput(source), options);
}
