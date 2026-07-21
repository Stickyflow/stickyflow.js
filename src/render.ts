// Public render entry (plan §7). render() never touches the DOM: it is a pure
// SFL-text -> SVG-string transform, verified to run under Node (no jsdom).
import { buildRenderScene } from '@features/content-io/export/rendering/buildRenderScene';
import { renderSceneToSvg } from '@features/content-io/export/rendering/renderSceneToSvg';
import type {
  RenderInput, RenderScene, RenderDiagnostic,
} from '@features/content-io/export/rendering/renderScene';
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
