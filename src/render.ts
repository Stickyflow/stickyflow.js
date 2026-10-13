import { sflToRenderInput } from './renderInput/fromSfl';
import type { RenderInput } from './renderInput/types';
import type { MeasureTextFactory, RenderDiagnostic, RenderScene } from './renderScene/scene';
import { buildRenderScene } from './renderScene/scene/build';
import { renderSceneToSvg } from './svg';

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
  linkHitAreas?: boolean;
}

export function renderCanvas(input: RenderInput, options: RenderOptions = {}): RenderResult {
  const scene = buildRenderScene(input, { measureText: options.measureText });
  const { svg, width, height, diagnostics } = renderSceneToSvg(scene, options);
  return { svg, width, height, diagnostics, scene };
}

const SCENE_CACHE_LIMIT = 50;
const sceneCache = new Map<string, RenderScene>();

function cachedRenderScene(source: string): RenderScene {
  const cached = sceneCache.get(source);
  if (cached) {
    sceneCache.delete(source);
    sceneCache.set(source, cached);
    return cached;
  }
  const scene = buildRenderScene(sflToRenderInput(source));
  sceneCache.set(source, scene);
  if (sceneCache.size > SCENE_CACHE_LIMIT) {
    const oldest = sceneCache.keys().next().value;
    if (oldest !== undefined) {
      sceneCache.delete(oldest);
    }
  }
  return scene;
}

export function render(source: string, options: RenderOptions = {}): RenderResult {
  if (options.measureText) {
    return renderCanvas(sflToRenderInput(source), options);
  }
  const scene = cachedRenderScene(source);
  const { svg, width, height, diagnostics } = renderSceneToSvg(scene, options);
  return { svg, width, height, diagnostics, scene };
}
