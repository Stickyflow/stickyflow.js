import { patchRootAttributes } from './rootAttributesPatch';
import { patchSceneNodes } from './sceneNodesPatch';

export function patchDisplayContent(svg: SVGSVGElement, next: SVGSVGElement): void {
  patchRootAttributes(svg, next);
  patchSceneNodes(svg, next);
}
