import type { RenderInput } from '../../renderInput/types';
import type { RenderNode } from '../scene';
import { tag } from '../scene/tagging';
import { buildFrame } from './container/frame';
import { buildSwimlane } from './container/swimlane';

export {
  bottomRoundedRectPath,
  leftRoundedRectPath,
  rightRoundedRectPath,
  topRoundedRectPath,
} from '../scene/roundedRectPath';
export { buildFrame } from './container/frame';
export { simpleContainerStyle } from './container/style';
export { buildSwimlane } from './container/swimlane';

export function buildContainers(input: Pick<RenderInput, 'frames' | 'swimlanes'>): RenderNode[] {
  return [
    ...input.frames.flatMap((frame, index) =>
      tag(buildFrame(frame, index), 'frame', frame.id, undefined, frame.title ?? undefined),
    ),
    ...input.swimlanes.flatMap((swimlane, index) => tag(buildSwimlane(swimlane, index), 'swimlane', swimlane.id)),
  ];
}
