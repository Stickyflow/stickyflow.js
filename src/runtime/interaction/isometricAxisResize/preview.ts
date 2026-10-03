import { isometricFaces, isometricTopFaceCenter } from '../../../model/isometricObject';
import { roundedPolygonPath } from '../../../renderScene/scene/roundedPolygonPath';
import { axisArrowPlacements, updateAxisArrowGroup, updateHalo } from '../../dom';
import type { IsometricAxis } from '../../dom/selectionOverlay/isometric';
import type { IsometricGeometryNodes, IsometricObjectSize } from './state';

// Mirrors renderScene/artifacts/isometric.ts's label constants exactly -
// the live preview has to reproduce the same single-line middle-aligned
// baseline math svg/text.ts uses at render time, not just the label's
// container box, since it's the <text> element's own y (its baseline)
// being written here.
const LABEL_GAP = 12;
const LABEL_HEIGHT = 20;
const LABEL_FONT_SIZE = 12;
const LABEL_LINE_HEIGHT = 1.2;
const LABEL_BASELINE_OFFSET =
  -LABEL_GAP - LABEL_HEIGHT + (LABEL_HEIGHT - LABEL_FONT_SIZE * LABEL_LINE_HEIGHT) / 2 + LABEL_FONT_SIZE;

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
    // Mirrors renderScene/artifacts/isometric.ts's own footprint math - the
    // live drag doesn't know a configured shadow(distance:…), so this
    // reproduces the no-distance case (shadowDrop = height) exactly; an
    // object with an explicit distance just lags by that fixed amount for
    // the duration of the drag, snapping correct once it's released.
    const contactFootprint = faces.top.map(point => ({ x: point.x, y: point.y + object.height }));
    const footprintCenter = {
      x: contactFootprint.reduce((sum, point) => sum + point.x, 0) / contactFootprint.length,
      y: contactFootprint.reduce((sum, point) => sum + point.y, 0) / contactFootprint.length,
    };
    const shadowSpread = 1.3;
    const footprint = contactFootprint.map(point => ({
      x: footprintCenter.x + (point.x - footprintCenter.x) * shadowSpread,
      y: footprintCenter.y + (point.y - footprintCenter.y) * shadowSpread,
    }));
    nodes.groundShadow.setAttribute('d', roundedPolygonPath(footprint, 0));
  }

  const anchor = isometricTopFaceCenter(object);
  if (nodes.labelGuide) {
    nodes.labelGuide.setAttribute('d', `M ${anchor.x} ${anchor.y - LABEL_GAP} L ${anchor.x} ${anchor.y}`);
  }
  if (nodes.label) {
    nodes.label.setAttribute('x', String(anchor.x));
    nodes.label.setAttribute('y', String(anchor.y + LABEL_BASELINE_OFFSET));
    nodes.label.querySelectorAll('tspan').forEach(tspan => {
      tspan.setAttribute('x', String(anchor.x));
    });
  }
}
