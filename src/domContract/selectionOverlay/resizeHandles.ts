import { svgElement } from './dom';
import { screenPx } from './scale';
import type { OverlayBounds, ResizeHandle } from './types';

const HANDLE_SIZE_PX = 6;
const HANDLE_STROKE_WIDTH_PX = 1;
const HANDLE_STROKE = '#992dff';
const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  'top-left': 'nwse-resize',
  top: 'ns-resize',
  'top-right': 'nesw-resize',
  right: 'ew-resize',
  'bottom-right': 'nwse-resize',
  bottom: 'ns-resize',
  'bottom-left': 'nesw-resize',
  left: 'ew-resize',
};

export function resizeHandlePositions(bounds: OverlayBounds): Array<[number, number, ResizeHandle]> {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  return [
    [bounds.x, bounds.y, 'top-left'],
    [centerX, bounds.y, 'top'],
    [bounds.x + bounds.width, bounds.y, 'top-right'],
    [bounds.x + bounds.width, centerY, 'right'],
    [bounds.x + bounds.width, bounds.y + bounds.height, 'bottom-right'],
    [centerX, bounds.y + bounds.height, 'bottom'],
    [bounds.x, bounds.y + bounds.height, 'bottom-left'],
    [bounds.x, centerY, 'left'],
  ];
}

export function renderResizeHandles(document: Document, bounds: OverlayBounds, svg: SVGSVGElement): SVGRectElement[] {
  const size = screenPx(svg, HANDLE_SIZE_PX);
  const strokeWidth = screenPx(svg, HANDLE_STROKE_WIDTH_PX);
  return resizeHandlePositions(bounds).map(([centerX, centerY, name]) => {
    const handle = svgElement(document, 'rect');
    handle.setAttribute('x', String(centerX - size / 2));
    handle.setAttribute('y', String(centerY - size / 2));
    handle.setAttribute('width', String(size));
    handle.setAttribute('height', String(size));
    handle.setAttribute('fill', 'white');
    handle.setAttribute('stroke', HANDLE_STROKE);
    handle.setAttribute('stroke-width', String(strokeWidth));
    handle.setAttribute('data-sf-resize-handle', name);
    handle.style.pointerEvents = 'auto';
    handle.style.cursor = HANDLE_CURSORS[name];
    return handle;
  });
}
