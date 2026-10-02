import { patchRootAttributes } from './rootAttributesPatch';
import { patchSceneNodes } from './sceneNodesPatch';
import type { SceneDiff } from './types';

export function patchDisplayContent(svg: SVGSVGElement, next: SVGSVGElement): SceneDiff {
  patchRootAttributes(svg, next);
  return patchSceneNodes(svg, next);
}
