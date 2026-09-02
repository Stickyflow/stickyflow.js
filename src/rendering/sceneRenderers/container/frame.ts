import type { Frame } from '../../../model/frames';
import { boxBounds, orderOf } from '../../renderPrimitives';
import type { RenderNode } from '../../scene';
import { simpleContainerStyle } from './style';
import { renderTitleTab } from './titleTab';

export function buildFrame(frame: Frame, index: number): RenderNode[] {
  if (frame.is_visible === false) {
    return [];
  }
  const order = orderOf(frame, index);
  const bounds = boxBounds(
    { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
    frame.stroke_width + 4,
  );
  const nodes: RenderNode[] = [
    {
      type: 'rect',
      id: `frame-${frame.id}`,
      order,
      bounds,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      rx: frame.corner_radius,
      style: simpleContainerStyle(frame.fill_color, frame.stroke_color, frame.stroke_width, frame.dash),
    },
  ];
  if ((frame.show_label ?? true) && frame.title) {
    nodes.push(
      ...renderTitleTab({
        tabId: `frame-tab-${frame.id}`,
        titleId: `frame-title-${frame.id}`,
        x: frame.x,
        y: frame.y,
        cornerRadius: frame.corner_radius,
        title: frame.title,
        color: frame.stroke_color,
        fontFamily: frame.font_family,
        fontSize: frame.font_size,
        fontWeight: frame.font_weight,
        order,
      }),
    );
  }
  return nodes;
}
