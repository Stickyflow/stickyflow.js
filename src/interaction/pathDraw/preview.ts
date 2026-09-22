import { pxPerUnit, SVG_NAMESPACE } from '../../domContract';
import { freeformPathData } from '../../rendering/scene/freeformPath';
import type { PathDrawState } from './state';

const PREVIEW_COLOR = '#9b42df';
const LINE_WIDTH_PX = 2;
const DASH_PX = 6;
const GAP_PX = 4;
const POINT_RADIUS_PX = 4;
const START_POINT_RADIUS_PX = 6;
const POINT_STROKE_WIDTH_PX = 1.5;

export function createPathDrawPreview(svg: SVGSVGElement): { group: SVGGElement; line: SVGPathElement } {
  const document = svg.ownerDocument;
  const group = document.createElementNS(SVG_NAMESPACE, 'g') as SVGGElement;
  group.setAttribute('pointer-events', 'none');
  const line = document.createElementNS(SVG_NAMESPACE, 'path') as SVGPathElement;
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', PREVIEW_COLOR);
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('stroke-linejoin', 'round');
  group.appendChild(line);
  return { group, line };
}

function pointMarker(svg: SVGSVGElement, point: { x: number; y: number }, highlighted: boolean): SVGCircleElement {
  const document = svg.ownerDocument;
  const unit = 1 / pxPerUnit(svg);
  const circle = document.createElementNS(SVG_NAMESPACE, 'circle') as SVGCircleElement;
  circle.setAttribute('cx', String(point.x));
  circle.setAttribute('cy', String(point.y));
  circle.setAttribute('r', String((highlighted ? START_POINT_RADIUS_PX : POINT_RADIUS_PX) * unit));
  circle.setAttribute('fill', highlighted ? PREVIEW_COLOR : '#ffffff');
  circle.setAttribute('stroke', PREVIEW_COLOR);
  circle.setAttribute('stroke-width', String(POINT_STROKE_WIDTH_PX * unit));
  return circle;
}

export function updatePathDrawPreview(svg: SVGSVGElement, state: PathDrawState): void {
  const { previewLine, previewGroup } = state;
  if (!previewLine || !previewGroup) {
    return;
  }
  const unit = 1 / pxPerUnit(svg);
  previewLine.setAttribute('stroke-width', String(LINE_WIDTH_PX * unit));
  previewLine.setAttribute('stroke-dasharray', `${DASH_PX * unit} ${GAP_PX * unit}`);

  const live = state.cursor ? [...state.points, state.cursor] : state.points;
  previewLine.setAttribute('d', freeformPathData({ points: live, tension: state.tension, closed: false }));

  while (previewGroup.childNodes.length > 1) {
    previewGroup.lastChild?.remove();
  }
  state.points.forEach((point, index) => {
    previewGroup.appendChild(pointMarker(svg, point, index === 0 && state.willClose));
  });
}
