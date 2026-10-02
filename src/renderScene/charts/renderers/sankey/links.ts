import type { Bounds, RenderNode, ScenePaint } from '../../../scene';
import type { SankeyLayoutLink } from '../../geometry/sankey';
import { DEFAULT_ZONE_FILL, resolveChartShadow } from '../../primitives';
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
  fill: ScenePaint;
  opacity: number;
}

export function renderSankeyLinks(context: ChartRenderContext, data: SankeyRenderData): RenderNode[] {
  const shadow = resolveChartShadow(context.chart.shadowStyle);
  const gradient = Boolean(context.chart.config?.linkGradient);
  const { plot } = context;
  const clipPath = shadow
    ? `M ${plot.x} ${plot.y} H ${plot.x + plot.width} V ${plot.y + plot.height} H ${plot.x} Z`
    : undefined;
  return data.links.map((link, linkIndex) => {
    const ribbon = createSankeyLinkRibbon(data, link, linkIndex, gradient);
    return createSankeyRibbonNode(context, ribbon, shadow, clipPath, gradient);
  });
}

function createSankeyLinkRibbon(
  data: SankeyRenderData,
  link: SankeyLayoutLink,
  linkIndex: number,
  gradient: boolean,
): SankeyLinkRibbon {
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
  const fromColor = link.color || data.nodeColors.get(link.source) || DEFAULT_ZONE_FILL;
  const toColor = data.nodeColors.get(link.target) || DEFAULT_ZONE_FILL;
  const fill: ScenePaint = gradient
    ? {
        kind: 'linear-gradient',
        angle: 0,
        stops: [
          { offset: 0, color: fromColor },
          { offset: 100, color: toColor },
        ],
      }
    : { kind: 'solid', color: link.color || toColor };
  return {
    linkIndex,
    source,
    target,
    controlX: (source.x + target.x) / 2,
    fill,
    opacity: link.color ? 0.85 : 0.45,
  };
}

function createSankeyRibbonNode(
  context: ChartRenderContext,
  ribbon: SankeyLinkRibbon,
  shadow: ReturnType<typeof resolveChartShadow>,
  clipPath: string | undefined,
  gradient: boolean,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const gradientBounds: Bounds = {
    minX: Math.min(ribbon.source.x, ribbon.target.x),
    maxX: Math.max(ribbon.source.x, ribbon.target.x),
    minY: Math.min(ribbon.source.top, ribbon.target.top),
    maxY: Math.max(ribbon.source.bottom, ribbon.target.bottom),
  };
  return {
    type: 'path',
    id: `chart-sankey-link-${chart.id}-${ribbon.linkIndex}`,
    order: nextOrder(),
    bounds: gradient ? gradientBounds : bounds,
    d: sankeyRibbonPath(ribbon),
    style: {
      fill: ribbon.fill,
      opacity: ribbon.opacity,
      shadow,
      clip: clipPath ? { type: 'path', d: clipPath } : undefined,
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
