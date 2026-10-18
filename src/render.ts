import {
  type ComponentDescriptor,
  componentRegistryVersion,
  type GenericComponent,
  registerComponentDescriptor,
} from './model/component';
import { sflToRenderInput } from './renderInput/fromSfl';
import type { RenderInput } from './renderInput/types';
import { registerComponentBuilder } from './renderScene/artifacts/component';
import type { MeasureTextFactory, RenderDiagnostic, RenderNode, RenderScene } from './renderScene/scene';
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
let cachedForRegistry = componentRegistryVersion();

function cachedRenderScene(source: string): RenderScene {
  const registry = componentRegistryVersion();
  if (registry !== cachedForRegistry) {
    sceneCache.clear();
    cachedForRegistry = registry;
  }
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

export interface ComponentSceneContext {
  order: number;
}

export interface ComponentDefinition extends ComponentDescriptor {
  scene(component: GenericComponent, context: ComponentSceneContext): RenderNode[];
}

const SCENE_ORDER_BASE = 10_000;

export function defineComponent(definition: ComponentDefinition): () => void {
  const { scene, ...descriptor } = definition;
  const unregisterDescriptor = registerComponentDescriptor(descriptor);
  const unregisterBuilder = registerComponentBuilder(descriptor.type, (component, index) =>
    scene(component as GenericComponent, { order: SCENE_ORDER_BASE + index }),
  );
  return () => {
    unregisterBuilder();
    unregisterDescriptor();
  };
}
