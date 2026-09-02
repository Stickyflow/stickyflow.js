import type { SankeyLayoutLink } from '../../../../model/geometry/sankey';
import type { RenderNode } from '../../../scene';
import { DEFAULT_ZONE_FILL } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { SankeyRenderData } from './types';

interface SankeyRibbonEdge {
  x: number;
  top: number;
  bottom: number;
}

interface SankeyLinkRibbon {
  linkIndex: number;
  source: SankeyRibbonEdge;
  target: SankeyRibbonEdge;
  controlX: number;
  color: string;
  opacity: number;
}

export function renderSankeyLinks(context: ChartRenderContext, data: SankeyRenderData): RenderNode[] {
  return data.links.map((link, linkIndex) => {
    const ribbon = createSankeyLinkRibbon(data, link, linkIndex);
    return createSankeyRibbonNode(context, ribbon);
  });
}

function createSankeyLinkRibbon(data: SankeyRenderData, link: SankeyLayoutLink, linkIndex: number): SankeyLinkRibbon {
  const source = {
    x: data.baseX + link.x0,
    top: data.baseY + link.sourceY0,
    bottom: data.baseY + link.sourceY1,
  };
  const target = {
    x: data.baseX + link.x1,
    top: data.baseY + link.targetY0,
    bottom: data.baseY + link.targetY1,
  };
  return {
    linkIndex,
    source,
    target,
    controlX: (source.x + target.x) / 2,
    color: link.color || data.nodeColors.get(link.target) || DEFAULT_ZONE_FILL,
    opacity: link.color ? 0.85 : 0.45,
  };
}

function createSankeyRibbonNode(context: ChartRenderContext, ribbon: SankeyLinkRibbon): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    type: 'path',
    id: `chart-sankey-link-${chart.id}-${ribbon.linkIndex}`,
    order: nextOrder(),
    bounds,
    d: sankeyRibbonPath(ribbon),
    style: {
      fill: { kind: 'solid', color: ribbon.color },
      opacity: ribbon.opacity,
    },
  };
}

function sankeyRibbonPath(ribbon: SankeyLinkRibbon): string {
  const { source, target, controlX } = ribbon;
  return [
    `M ${source.x} ${source.top}`,
    `C ${controlX} ${source.top} ${controlX} ${target.top} ${target.x} ${target.top}`,
    `L ${target.x} ${target.bottom}`,
    `C ${controlX} ${target.bottom} ${controlX} ${source.bottom} ${source.x} ${source.bottom}`,
    'Z',
  ].join(' ');
}
