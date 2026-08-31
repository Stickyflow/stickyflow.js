import type { RenderScene } from './renderScene';
import { renderSvgDocument } from './svg/document';
import type { SvgRenderOptions, SvgRenderResult } from './svg/types';

export type { SvgRenderOptions, SvgRenderResult } from './svg/types';

export function renderSceneToSvg(scene: RenderScene, options: SvgRenderOptions = {}): SvgRenderResult {
  return renderSvgDocument(scene, options);
}
