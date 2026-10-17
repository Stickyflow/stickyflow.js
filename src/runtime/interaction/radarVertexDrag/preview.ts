import { radarSeriesPath, radarVertexPoint } from '../../../renderScene/charts/primitives/radarShape';
import type { RadarVertexDragState } from './types';

function seriesVertices(svg: SVGSVGElement, ownerId: string, series: string): SVGGraphicsElement[] {
  const selector =
    `[data-sf-id="${CSS.escape(ownerId)}"]` +
    `[data-sf-series="${CSS.escape(series)}"]` +
    `[data-sf-mark="radar-vertex"]`;
  return [...svg.querySelectorAll<SVGGraphicsElement>(selector)].sort(
    (a, b) => Number(a.getAttribute('data-sf-value-index')) - Number(b.getAttribute('data-sf-value-index')),
  );
}

function seriesShapes(svg: SVGSVGElement, ownerId: string, series: string): SVGGraphicsElement[] {
  const selector =
    `path[data-sf-id="${CSS.escape(ownerId)}"]` + `[data-sf-series="${CSS.escape(series)}"]:not([data-sf-mark])`;
  return [...svg.querySelectorAll<SVGGraphicsElement>(selector)];
}

export function updateRadarVertexDragPreview(svg: SVGSVGElement, drag: RadarVertexDragState, value: number): void {
  const point = radarVertexPoint(drag.frame, drag.index, value);
  drag.element.setAttribute('cx', String(point.x));
  drag.element.setAttribute('cy', String(point.y));

  const points = seriesVertices(svg, drag.owner.id, drag.series).map(vertex => ({
    x: Number(vertex.getAttribute('cx')),
    y: Number(vertex.getAttribute('cy')),
  }));
  const path = radarSeriesPath(points, drag.frame.curved, drag.frame.tension);
  for (const shape of seriesShapes(svg, drag.owner.id, drag.series)) {
    shape.setAttribute('d', path);
  }
}
