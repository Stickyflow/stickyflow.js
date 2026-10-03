import { isometricBounds, isometricFaces } from '../../../model/isometricObject';
import { roundedPolygonPath } from '../../../renderScene/scene/roundedPolygonPath';
import { axisArrowPlacements, updateAxisArrowGroup, updateHalo } from '../../dom';
import type { IsometricAxis } from '../../dom/selectionOverlay/isometric';
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
  overlay: { halo: SVGPathElement | null; arrows: Record<IsometricAxis, SVGGElement | null> },
  svg: SVGSVGElement,
): void {
  const faces = isometricFaces(object);
  // object.width/height are true axis edge lengths, not the on-screen box -
  // see isometricBounds. groundShadow/label/labelGuide are sized off the
  // box, same as the renderer.
  const box = isometricBounds(object);

  nodes.top?.setAttribute('d', roundedPolygonPath(faces.top, 0));
  nodes.front?.setAttribute('d', roundedPolygonPath(faces.front, 0));
  nodes.side?.setAttribute('d', roundedPolygonPath(faces.side, 0));

  const silhouette = [faces.top[0], faces.top[1], faces.side[2], faces.front[2], faces.front[3], faces.top[3]];
  const hullPath = roundedPolygonPath(silhouette, cornerRadius);
  nodes.hull?.setAttribute('d', hullPath);
  if (overlay.halo) {
    updateHalo(overlay.halo, hullPath);
  }

  const placements = axisArrowPlacements(object);
  (Object.keys(placements) as IsometricAxis[]).forEach(axis => {
    const group = overlay.arrows[axis];
    if (group) {
      updateAxisArrowGroup(group, placements[axis].origin, placements[axis].direction, svg);
    }
  });

  nodes.seams?.setAttribute(
    'd',
    `M ${faces.top[3].x} ${faces.top[3].y} L ${faces.top[2].x} ${faces.top[2].y} L ${faces.top[1].x} ${faces.top[1].y} M ${faces.top[2].x} ${faces.top[2].y} L ${faces.front[2].x} ${faces.front[2].y}`,
  );

  if (nodes.groundShadow) {
    nodes.groundShadow.setAttribute('cx', String(box.x + box.width / 2));
    nodes.groundShadow.setAttribute('cy', String(box.y + box.height));
    nodes.groundShadow.setAttribute('rx', String(box.width * 0.35));
    nodes.groundShadow.setAttribute('ry', String(Math.max(3, object.depth * 0.35)));
  }

  const centerX = box.x + box.width / 2;
  if (nodes.labelGuide) {
    nodes.labelGuide.setAttribute('d', `M ${centerX} ${box.y - LABEL_GAP} L ${centerX} ${box.y}`);
  }
  if (nodes.label) {
    nodes.label.setAttribute('x', String(centerX));
    nodes.label.querySelectorAll('tspan').forEach(tspan => {
      tspan.setAttribute('x', String(centerX));
    });
  }
}
