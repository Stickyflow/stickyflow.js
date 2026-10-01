import type { Frame } from '../../../model/frames';
import { cornersRoundedRectPath, type RectCornerRadii } from '../../../model/geometry/roundedRect';
import type { RenderNode } from '../../scene';
import { boxBounds, orderOf } from '../../scene';
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
    frame.stroke_width + (shadow ? 20 : 4),
  );
  const style = {
    ...simpleContainerStyle(frame.fill_color, frame.stroke_color, frame.stroke_width, frame.dash),
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
      rx: frame.corner_radius,
      style,
    };
  }
  const squared = SQUARED_CORNER_BY_LABEL_POSITION[frame.label_position ?? 'top'];
  const radii: RectCornerRadii = {
    topLeft: frame.corner_radius,
    topRight: frame.corner_radius,
    bottomRight: frame.corner_radius,
    bottomLeft: frame.corner_radius,
    [squared]: 0,
  };
  return {
    type: 'path',
    id: `frame-${frame.id}`,
    order,
    bounds,
    d: cornersRoundedRectPath(frame.x, frame.y, frame.width, frame.height, radii),
    detail: { of: 'frameBoundary', cornerRadius: frame.corner_radius, squareCorner: squared },
    style,
  };
}

export function buildFrame(frame: Frame, index: number): RenderNode[] {
  if (frame.is_visible === false) {
    return [];
  }
  const order = orderOf(frame, index);
  const hasTab = (frame.show_label ?? true) && Boolean(frame.title);
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
        cornerRadius: frame.corner_radius,
        strokeWidth: frame.stroke_width,
        title: frame.title,
        color: frame.stroke_color,
        textColor: frame.text_color,
        fontFamily: frame.font_family,
        fontSize: frame.font_size,
        fontWeight: frame.font_weight,
        labelPosition: frame.label_position ?? 'top',
        order,
      }),
    );
  }
  return nodes;
}
