import type { RenderNode } from '../../../renderScene';
import type { SwimlaneRenderContext } from './types';

function dividerPath(context: SwimlaneRenderContext, offset: number): string {
  const { swimlane } = context;
  if (swimlane.orientation === 'horizontal') {
    return `M ${swimlane.x} ${swimlane.y + offset} H ${swimlane.x + swimlane.width}`;
  }
  return `M ${swimlane.x + offset} ${swimlane.y} V ${swimlane.y + swimlane.height}`;
}

export function renderLaneDividers(context: SwimlaneRenderContext): RenderNode[] {
  return context.lanes.slice(1).map((lane, index) => ({
    type: 'path',
    id: `swimlane-divider-${context.swimlane.id}-${index}`,
    order: context.order + 0.1 + index / 100,
    bounds: context.bounds,
    d: dividerPath(context, lane.offset),
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: context.swimlane.stroke_color },
      strokeWidth: context.swimlane.stroke_width,
    },
  }));
}
