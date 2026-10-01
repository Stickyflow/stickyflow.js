import type { Swimlane } from '../../../../model/swimlane';
import type { RenderNode } from '../../../scene';
import { resolveShadow } from '../../../scene/shadow';
import { simpleContainerStyle } from '../style';
import { renderLaneDividers } from './dividers';
import { renderLaneLabels } from './labels';
import { createSwimlaneRenderContext } from './layout';

export function buildSwimlane(swimlane: Swimlane, index: number): RenderNode[] {
  if (swimlane.isVisible === false) {
    return [];
  }
  const context = createSwimlaneRenderContext(swimlane, index);
  return [
    {
      type: 'rect',
      id: `swimlane-${swimlane.id}`,
      order: context.order,
      bounds: context.bounds,
      x: swimlane.x,
      y: swimlane.y,
      width: swimlane.width,
      height: swimlane.height,
      rx: swimlane.cornerRadius,
      style: {
        ...simpleContainerStyle(swimlane.fillColor, swimlane.strokeColor, swimlane.strokeWidth, swimlane.dash),
        shadow: resolveShadow(swimlane.shadowStyle),
      },
    },
    ...renderLaneDividers(context),
    ...renderLaneLabels(context),
  ];
}
