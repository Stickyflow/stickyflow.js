import type { RenderScene } from '../scene';
import { renderSvgDocument } from './document';
import type { SvgRenderOptions, SvgRenderResult } from './types';

export type { SvgRenderOptions, SvgRenderResult } from './types';

export function renderSceneToSvg(scene: RenderScene, options: SvgRenderOptions = {}): SvgRenderResult {
  return renderSvgDocument(scene, options);
}
