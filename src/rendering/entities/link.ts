import type { RenderInput } from '../../renderInput/types';
import type { MeasureTextFactory, RenderNode } from '../scene';
import { renderEndpointLabels } from './link/endpointLabels';
import { renderMainLabel } from './link/label';
import { createLinkRenderContext } from './link/layout';
import { renderLinkPath } from './link/path';
import { renderWeightBadge } from './link/weight';

export function buildLink(
  item: RenderInput['links'][number],
  index: number,
  measureText?: MeasureTextFactory,
): RenderNode[] {
  if (item.link.isVisible === false) {
    return [];
  }
  const context = createLinkRenderContext(item, index, measureText);
  return [
    renderLinkPath(context),
    ...renderMainLabel(context),
    ...renderWeightBadge(context),
    ...renderEndpointLabels(context),
  ];
}
