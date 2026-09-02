import type { MeasureTextFactory } from './model/geometry/text';
import type { RenderInput } from './renderInput/types';
import { renderSceneToSvg } from './rendering/renderSceneToSvg';
import type { RenderDiagnostic, RenderScene } from './rendering/scene';
import { buildRenderScene } from './rendering/scene/build';
import { sflToRenderInput } from './sflToRenderInput';

export interface RenderResult {
  svg: string;
  width: number;
  height: number;
  diagnostics: RenderDiagnostic[];
  scene: RenderScene;
}

export interface RenderOptions {
  padding?: number;
  includeXmlDeclaration?: boolean;
  idPrefix?: string;
  measureText?: MeasureTextFactory;
}

export function renderCanvas(input: RenderInput, options: RenderOptions = {}): RenderResult {
  const scene = buildRenderScene(input, { measureText: options.measureText });
  const { svg, width, height, diagnostics } = renderSceneToSvg(scene, options);
  return { svg, width, height, diagnostics, scene };
}

export function render(source: string, options: RenderOptions = {}): RenderResult {
  return renderCanvas(sflToRenderInput(source), options);
}
