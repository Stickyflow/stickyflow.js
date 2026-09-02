import { DEFAULT_FONT, rotatedBounds } from '../../../renderPrimitives';
import type { RenderNode, SceneText } from '../../../scene';
import type { PositionedLane, SwimlaneRenderContext } from './types';

function labelBase(context: SwimlaneRenderContext, lane: PositionedLane, index: number) {
  return {
    type: 'text' as const,
    id: `swimlane-label-${context.swimlane.id}-${lane.id}`,
    order: context.order + 0.5 + index / 100,
    lines: [lane.label],
    fontFamily: context.swimlane.font_family ?? DEFAULT_FONT,
    fontSize: context.swimlane.font_size,
    fontWeight: context.swimlane.font_weight,
    color: context.swimlane.text_color,
    lineHeight: 1.2,
  };
}

function horizontalLabel(context: SwimlaneRenderContext, lane: PositionedLane, index: number): SceneText {
  const thickness = context.swimlane.font_size * 1.4;
  const centerX = context.swimlane.x + 10 + thickness / 2;
  const centerY = context.swimlane.y + lane.offset + lane.size / 2;
  const width = Math.max(20, lane.size - 16);
  const x = centerX - width / 2;
  const y = centerY - thickness / 2;
  return {
    ...labelBase(context, lane, index),
    bounds: rotatedBounds({ x, y, width, height: thickness }, -90, 12),
    x,
    y,
    width,
    height: thickness,
    align: 'center',
    verticalAlign: 'middle',
    rotation: -90,
    rotationCenter: { x: centerX, y: centerY },
  };
}

function verticalLabel(context: SwimlaneRenderContext, lane: PositionedLane, index: number): SceneText {
  return {
    ...labelBase(context, lane, index),
    bounds: context.bounds,
    x: context.swimlane.x + lane.offset + 8,
    y: context.swimlane.y + 8,
    width: Math.max(0, lane.size - 16),
    height: Math.max(0, context.swimlane.height - 16),
    align: 'left',
    verticalAlign: 'top',
  };
}

export function renderLaneLabels(context: SwimlaneRenderContext): RenderNode[] {
  if (!context.swimlane.show_lane_labels) {
    return [];
  }
  const render = context.swimlane.orientation === 'horizontal' ? horizontalLabel : verticalLabel;
  return context.lanes.map((lane, index) => render(context, lane, index));
}
