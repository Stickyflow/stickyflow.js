// Public render entry (plan §7). render() never touches the DOM: it is a pure
// SFL-text -> SVG-string transform, verified to run under Node (no jsdom).
import { buildRenderScene } from './rendering/buildRenderScene';
import { renderSceneToSvg } from './rendering/renderSceneToSvg';
import type {
  RenderInput, RenderScene, RenderDiagnostic,
} from './rendering/renderScene';
import { sflToRenderInput } from './sflToRenderInput';
import type { MeasureTextFactory } from './model/geometry/text';

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
  /**
   * Measure text with real glyph metrics instead of this package's
   * character-count heuristic. Called once per text node with that node's
   * resolved `(fontFamily, fontSize)`; return the widths for it.
   *
   * Leave unset for the default. The heuristic is why render() is
   * reproducible — no font files, no canvas, so the same SFL yields the same
   * bytes under Node, in CI, and in every browser, which is what the golden
   * SVGs pin. Supplying real metrics trades that away: output then depends on
   * the fonts actually installed where it ran.
   *
   * Worth the trade when the SVG has to line up with text laid out elsewhere
   * — a browser host matching its own live canvas, or a page where the label
   * wrap has to agree with what the user was just editing. stickyflow-atlas's
   * `createTextMeasurer(fontFamily, fontSize)` already returns exactly this
   * shape and can be passed straight through.
   */
  measureText?: MeasureTextFactory;
}

/** Render an already-built RenderInput to SVG. Headless and pure. */
export function renderCanvas(input: RenderInput, options: RenderOptions = {}): RenderResult {
  const scene = buildRenderScene(input, { measureText: options.measureText });
  const { svg, width, height, diagnostics } = renderSceneToSvg(scene, options);
  return { svg, width, height, diagnostics, scene };
}

/** Render SFL source text straight to SVG. */
export function render(source: string, options: RenderOptions = {}): RenderResult {
  return renderCanvas(sflToRenderInput(source), options);
}
