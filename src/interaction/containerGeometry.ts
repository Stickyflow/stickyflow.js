import type { Rect } from '../model/geometry/types';

export const CONTAINER_ROLES: ReadonlySet<string> = new Set(['frame', 'swimlane']);

export function childrenUnionBounds(svg: SVGSVGElement, containerId: string): Rect | undefined {
  const nodes = svg.querySelectorAll(`[data-sf-parent-frame="${CSS.escape(containerId)}"]`);
  let result: Rect | undefined;
  nodes.forEach(node => {
    const bbox = (node as unknown as SVGGraphicsElement).getBBox();
    if (!result) {
      result = { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
      return;
    }
    const minX = Math.min(result.x, bbox.x);
    const minY = Math.min(result.y, bbox.y);
    const maxX = Math.max(result.x + result.width, bbox.x + bbox.width);
    const maxY = Math.max(result.y + result.height, bbox.y + bbox.height);
    result = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  });
  return result;
}
