import type { SankeyLayoutLink } from '../../../model/geometry/sankey';
import { DEFAULT_ZONE_FILL } from '../../chartPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import type { SankeyRenderData } from './types';

export function renderSankeyLinks(context: ChartRenderContext, data: SankeyRenderData): RenderNode[] {
  return data.links.map((link, linkIndex) => createLinkNode(context, data, link, linkIndex));
}

function createLinkNode(
  context: ChartRenderContext,
  data: SankeyRenderData,
  link: SankeyLayoutLink,
  linkIndex: number,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const x0 = data.baseX + link.x0;
  const x1 = data.baseX + link.x1;
  const sourceTop = data.baseY + link.sourceY0;
  const sourceBottom = data.baseY + link.sourceY1;
  const targetTop = data.baseY + link.targetY0;
  const targetBottom = data.baseY + link.targetY1;
  const middleX = (x0 + x1) / 2;
  const path = createLinkPath(x0, x1, sourceTop, sourceBottom, targetTop, targetBottom, middleX);
  const color = link.color || data.nodeColors.get(link.target) || DEFAULT_ZONE_FILL;
  return {
    type: 'path',
    id: `chart-sankey-link-${chart.id}-${linkIndex}`,
    order: nextOrder(),
    bounds,
    d: path,
    style: {
      fill: { kind: 'solid', color },
      opacity: link.color ? 0.85 : 0.45,
    },
  };
}

function createLinkPath(
  x0: number,
  x1: number,
  sourceTop: number,
  sourceBottom: number,
  targetTop: number,
  targetBottom: number,
  middleX: number,
): string {
  return `M ${x0} ${sourceTop} C ${middleX} ${sourceTop} ${middleX} ${targetTop} ${x1} ${targetTop} L ${x1} ${targetBottom} C ${middleX} ${targetBottom} ${middleX} ${sourceBottom} ${x0} ${sourceBottom} Z`;
}
