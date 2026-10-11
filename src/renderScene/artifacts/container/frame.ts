import type { Frame } from '../../../model/frame';
import type { RenderNode } from '../../scene';
import { boxBounds } from '../../scene';
import { cornersRoundedRectPath, type RectCornerRadii } from '../../scene/roundedRectPath';
import { simpleContainerStyle } from './style';
import { renderTitleTab, type TitleTabPosition } from './titleTab';

const SQUARED_CORNER_BY_LABEL_POSITION: Record<TitleTabPosition, keyof RectCornerRadii> = {
  top: 'topLeft',
  bottom: 'bottomLeft',
  left: 'topLeft',
  right: 'topRight',
};

function frameBoundaryNode(frame: Frame, order: number, hasTab: boolean): RenderNode {
  const shadow = frame.shadow ?? true;
  const bounds = boxBounds(
    { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
    frame.strokeWidth + (shadow ? 20 : 4),
  );
  const style = {
    ...simpleContainerStyle(frame.fillColor, frame.strokeColor, frame.strokeWidth, frame.dash),
    shadow: shadow ? { color: '#000000', opacity: 0.2, blur: 12, dx: 0, dy: 4 } : undefined,
  };
  if (!hasTab) {
    return {
      type: 'rect',
      id: `frame-${frame.id}`,
      order,
      bounds,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      rx: frame.cornerRadius,
      style,
    };
  }
  const squared = SQUARED_CORNER_BY_LABEL_POSITION[frame.labelPosition ?? 'top'];
  const radii: RectCornerRadii = {
    topLeft: frame.cornerRadius,
    topRight: frame.cornerRadius,
    bottomRight: frame.cornerRadius,
    bottomLeft: frame.cornerRadius,
    [squared]: 0,
  };
  return {
    type: 'path',
    id: `frame-${frame.id}`,
    order,
    bounds,
    d: cornersRoundedRectPath(frame.x, frame.y, frame.width, frame.height, radii),
    detail: { of: 'frameBoundary', cornerRadius: frame.cornerRadius, squareCorner: squared },
    style,
  };
}

export function buildFrame(frame: Frame, index: number): RenderNode[] {
  if (frame.isVisible === false) {
    return [];
  }
  const order = index;
  const hasTab = (frame.showLabel ?? true) && Boolean(frame.title);
  const nodes: RenderNode[] = [frameBoundaryNode(frame, order, hasTab)];
  if (hasTab && frame.title) {
    nodes.push(
      ...renderTitleTab({
        tabId: `frame-tab-${frame.id}`,
        titleId: `frame-title-${frame.id}`,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        cornerRadius: frame.cornerRadius,
        strokeWidth: frame.strokeWidth,
        title: frame.title,
        color: frame.strokeColor,
        textColor: frame.textColor,
        fontFamily: frame.fontFamily,
        fontSize: frame.fontSize,
        fontWeight: frame.fontWeight,
        labelPosition: frame.labelPosition ?? 'top',
        order,
      }),
    );
  }
  return nodes;
}
