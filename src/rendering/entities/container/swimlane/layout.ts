import type { Lane, Swimlane } from '../../../../model/swimlane';
import { boxBounds, orderOf } from '../../../scene';
import type { PositionedLane, SwimlaneRenderContext } from './types';

function normalizeLanes(swimlane: Swimlane): Lane[] {
  const targetSize = swimlane.orientation === 'horizontal' ? swimlane.height : swimlane.width;
  const total = swimlane.lanes.reduce((sum, lane) => sum + lane.size, 0);
  if (total <= 0 || targetSize <= 0) {
    return swimlane.lanes;
  }
  return swimlane.lanes.map(lane => ({ ...lane, size: lane.size * (targetSize / total) }));
}

function positionLanes(swimlane: Swimlane): PositionedLane[] {
  let offset = 0;
  return normalizeLanes(swimlane).map(lane => {
    const positioned = { ...lane, offset };
    offset += lane.size;
    return positioned;
  });
}

export function createSwimlaneRenderContext(swimlane: Swimlane, index: number): SwimlaneRenderContext {
  return {
    swimlane,
    order: orderOf(swimlane, 5_000 + index),
    bounds: boxBounds(
      { x: swimlane.x, y: swimlane.y, width: swimlane.width, height: swimlane.height },
      swimlane.stroke_width + 4,
    ),
    lanes: positionLanes(swimlane),
  };
}
