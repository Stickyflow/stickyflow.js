import { resolveShadow } from '../../../../model/shadow';
import type { Swimlane } from '../../../../model/swimlane';
import type { RenderNode } from '../../../scene';
import { simpleContainerStyle } from '../style';
import { renderLaneDividers } from './dividers';
import { renderLaneLabels } from './labels';
import { createSwimlaneRenderContext } from './layout';

export function buildSwimlane(swimlane: Swimlane, index: number): RenderNode[] {
  if (swimlane.is_visible === false) {
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
      rx: swimlane.corner_radius,
      style: {
        ...simpleContainerStyle(swimlane.fill_color, swimlane.stroke_color, swimlane.stroke_width, swimlane.dash),
        shadow: resolveShadow(swimlane.shadow_style),
      },
    },
    ...renderLaneDividers(context),
    ...renderLaneLabels(context),
  ];
}
