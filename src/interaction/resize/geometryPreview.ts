import type { Rect } from '../../model/geometry/router';
import { localShapePath } from '../../model/geometry/shapes';
import type { ShapeType } from '../../model/shapes';
import { recenterRotation } from './rotation';

function applyRectBounds(rect: SVGGraphicsElement, kind: string | null, bounds: Rect): void {
  rect.setAttribute('x', String(bounds.x));
  rect.setAttribute('y', String(bounds.y));
  rect.setAttribute('width', String(bounds.width));
  rect.setAttribute('height', String(bounds.height));
  if (kind === 'pill') {
    rect.setAttribute('rx', String(Math.min(bounds.width, bounds.height) / 2));
  }
}

function applyEllipseBounds(ellipse: SVGGraphicsElement, bounds: Rect): void {
  ellipse.setAttribute('cx', String(bounds.x + bounds.width / 2));
  ellipse.setAttribute('cy', String(bounds.y + bounds.height / 2));
  ellipse.setAttribute('rx', String(bounds.width / 2));
  ellipse.setAttribute('ry', String(bounds.height / 2));
}

function applyPathBounds(path: SVGGraphicsElement, kind: string, bounds: Rect): void {
  const pathData = localShapePath(kind as ShapeType, bounds.x, bounds.y, bounds.width, bounds.height);
  if (pathData) {
    path.setAttribute('d', pathData);
  }
}

export function applySingleNodeBounds(primary: SVGGraphicsElement, kind: string | null, bounds: Rect): void {
  const tag = primary.tagName.toLowerCase();
  if (tag === 'rect') {
    applyRectBounds(primary, kind, bounds);
  } else if (tag === 'ellipse') {
    applyEllipseBounds(primary, bounds);
  } else if (tag === 'path' && kind) {
    applyPathBounds(primary, kind, bounds);
  }
  recenterRotation(primary, bounds);
}

export function applyCompositeScale(nodes: SVGGraphicsElement[], startBounds: Rect, liveBounds: Rect): void {
  const scaleX = liveBounds.width / startBounds.width;
  const scaleY = liveBounds.height / startBounds.height;
  const transform = `translate(${liveBounds.x} ${liveBounds.y}) scale(${scaleX} ${scaleY}) translate(${-startBounds.x} ${-startBounds.y})`;
  for (const node of nodes) {
    node.setAttribute('transform', transform);
  }
}
