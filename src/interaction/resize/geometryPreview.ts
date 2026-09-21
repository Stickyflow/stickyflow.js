import {
  CORNER_RADIUS_ATTR,
  SQUARE_CORNER_ATTR,
  SYMBOL_POINTS_ATTR,
  SYMBOL_TENSION_ATTR,
} from '../../model/domContractAttributes';
import { cornersRoundedRectPath, type RectCornerRadii } from '../../model/geometry/roundedRect';
import type { Rect } from '../../model/geometry/router';
import { localShapePath } from '../../model/geometry/shapes';
import type { ShapeType } from '../../model/shapes';
import { freeformPathData } from '../../rendering/scene/freeformPath';
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

function applySymbolBounds(path: SVGGraphicsElement, bounds: Rect): boolean {
  const raw = path.getAttribute(SYMBOL_POINTS_ATTR);
  if (!raw) {
    return false;
  }
  const points = (JSON.parse(raw) as Array<[number, number]>).map(([x, y]) => ({
    x: bounds.x + x * bounds.width,
    y: bounds.y + y * bounds.height,
  }));
  const tension = Number(path.getAttribute(SYMBOL_TENSION_ATTR)) || 0;
  path.setAttribute('d', freeformPathData({ points, tension, closed: true }));
  return true;
}

function applyPathBounds(path: SVGGraphicsElement, kind: string, bounds: Rect): void {
  if (kind === 'symbol' && applySymbolBounds(path, bounds)) {
    return;
  }
  const pathData = localShapePath(kind as ShapeType, bounds.x, bounds.y, bounds.width, bounds.height);
  if (pathData) {
    path.setAttribute('d', pathData);
  }
}

function applyFrameBoundaryBounds(path: SVGGraphicsElement, bounds: Rect): void {
  const cornerRadius = Number(path.getAttribute(CORNER_RADIUS_ATTR) ?? 0);
  const squareCorner = path.getAttribute(SQUARE_CORNER_ATTR) as keyof RectCornerRadii | null;
  const radii: RectCornerRadii = {
    topLeft: cornerRadius,
    topRight: cornerRadius,
    bottomRight: cornerRadius,
    bottomLeft: cornerRadius,
  };
  if (squareCorner) {
    radii[squareCorner] = 0;
  }
  path.setAttribute('d', cornersRoundedRectPath(bounds.x, bounds.y, bounds.width, bounds.height, radii));
}

export function applySingleNodeBounds(primary: SVGGraphicsElement, kind: string | null, bounds: Rect): void {
  const tag = primary.tagName.toLowerCase();
  if (tag === 'rect') {
    applyRectBounds(primary, kind, bounds);
  } else if (tag === 'ellipse') {
    applyEllipseBounds(primary, bounds);
  } else if (tag === 'path' && primary.hasAttribute(CORNER_RADIUS_ATTR)) {
    applyFrameBoundaryBounds(primary, bounds);
  } else if (tag === 'path' && kind) {
    applyPathBounds(primary, kind, bounds);
  }
  recenterRotation(primary, bounds);
}

export function applyCompositeScale(
  nodes: SVGGraphicsElement[],
  startBounds: Rect,
  liveBounds: Rect,
  baseTransforms?: ReadonlyArray<string | null>,
): void {
  const scaleX = liveBounds.width / startBounds.width;
  const scaleY = liveBounds.height / startBounds.height;
  const transform = `translate(${liveBounds.x} ${liveBounds.y}) scale(${scaleX} ${scaleY}) translate(${-startBounds.x} ${-startBounds.y})`;
  nodes.forEach((node, index) => {
    const base = baseTransforms?.[index];
    node.setAttribute('transform', base ? `${transform} ${base}` : transform);
  });
}
