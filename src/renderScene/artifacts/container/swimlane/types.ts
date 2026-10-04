import type { Lane, Swimlane } from '../../../../model/swimlane';
import type { Bounds } from '../../../scene';

export interface PositionedLane extends Lane {
  offset: number;
}

export interface SwimlaneRenderContext {
  swimlane: Swimlane;
  order: number;
  bounds: Bounds;
  lanes: PositionedLane[];
}
