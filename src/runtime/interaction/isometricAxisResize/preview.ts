import { isometricFaces } from '../../../model/isometricObject';
import { roundedPolygonPath } from '../../../renderScene/scene/roundedPolygonPath';
import type { IsometricGeometryNodes, IsometricObjectSize } from './state';

const LABEL_GAP = 12;

// Mirrors renderScene/artifacts/isometric.ts's own geometry build, applied
// directly to the live DOM nodes instead of producing new RenderNodes - the
// axis handles need to see the box update as they drag it, not only once
// the pointer is released and the owning app re-renders from committed SFL.
export function applyIsometricAxisPreview(
  nodes: IsometricGeometryNodes,
  object: IsometricObjectSize,
  cornerRadius: number,
): void {
  const faces = isometricFaces(object);

  nodes.top?.setAttribute('d', roundedPolygonPath(faces.top, 0));
  nodes.front?.setAttribute('d', roundedPolygonPath(faces.front, 0));
  nodes.side?.setAttribute('d', roundedPolygonPath(faces.side, 0));

  const silhouette = [faces.top[0], faces.top[1], faces.side[2], faces.front[2], faces.front[3], faces.top[3]];
  nodes.hull?.setAttribute('d', roundedPolygonPath(silhouette, cornerRadius));

  nodes.seams?.setAttribute(
    'd',
    `M ${faces.top[3].x} ${faces.top[3].y} L ${faces.top[2].x} ${faces.top[2].y} L ${faces.top[1].x} ${faces.top[1].y} M ${faces.top[2].x} ${faces.top[2].y} L ${faces.front[2].x} ${faces.front[2].y}`,
  );

  if (nodes.groundShadow) {
    nodes.groundShadow.setAttribute('cx', String(object.x + object.width / 2));
    nodes.groundShadow.setAttribute('cy', String(object.y + object.height));
    nodes.groundShadow.setAttribute('rx', String(object.width * 0.35));
    nodes.groundShadow.setAttribute('ry', String(Math.max(3, object.depth * 0.35)));
  }

  const centerX = object.x + object.width / 2;
  if (nodes.labelGuide) {
    nodes.labelGuide.setAttribute('d', `M ${centerX} ${object.y - LABEL_GAP} L ${centerX} ${object.y}`);
  }
  if (nodes.label) {
    nodes.label.setAttribute('x', String(centerX));
    nodes.label.querySelectorAll('tspan').forEach(tspan => {
      tspan.setAttribute('x', String(centerX));
    });
  }
}
