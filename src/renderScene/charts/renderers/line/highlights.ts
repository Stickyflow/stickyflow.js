import type { ChartSeries } from '../../../../model/chart';
import type { RenderNode } from '../../../scene';
import { paint } from '../../../scene';
import { chartText } from '../../primitives';
import { pixelPoints, seriesValuePairs } from '../cartesianPoints';
import type { ChartRenderContext } from '../types';

function formatHighlight(template: string | undefined, category: string, value: number): string {
  return (template || '{value}')
    .replace('{category}', category)
    .replace('{value}', String(Math.round(value * 100) / 100));
}

interface Mark {
  key: string;
  point: { x: number; y: number };
  index: number;
  radius: number;
  color: string;
}

function guideNode(context: ChartRenderContext, mark: Mark): RenderNode {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  return {
    type: 'path',
    id: `chart-highlight-guide-${mark.key}`,
    order: nextOrder(),
    bounds,
    d: `M ${mark.point.x} ${mark.point.y} V ${plot.y + plot.height}`,
    style: {
      fill: { kind: 'none' },
      stroke: paint(mark.color, diagnostics, chart.id),
      strokeWidth: 1,
      dash: [3, 4],
      opacity: 0.55,
      pointerEvents: 'none',
    },
  };
}

function dotNode(context: ChartRenderContext, mark: Mark): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const glow = chart.config?.lineGlow;
  return {
    type: 'ellipse',
    id: `chart-highlight-${mark.key}`,
    order: nextOrder(),
    bounds,
    cx: mark.point.x,
    cy: mark.point.y,
    rx: mark.radius,
    ry: mark.radius,
    style: {
      fill: paint(mark.color, diagnostics, chart.id),
      shadow: glow ? { color: mark.color, opacity: 0.9, blur: glow, dx: 0, dy: 0 } : undefined,
      pointerEvents: 'none',
    },
  };
}

function labelNode(context: ChartRenderContext, mark: Mark, value: number): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const config = chart.config;
  const fontSize = Math.max(9, chart.fontSize ?? 12);
  const text = formatHighlight(config?.highlightLabelFormat, config?.categories?.[mark.index] ?? '', value);
  const width = Math.max(48, text.length * fontSize * 0.62);
  return {
    ...chartText({
      id: `chart-highlight-label-${mark.key}`,
      order: nextOrder(),
      bounds,
      frame: {
        x: mark.point.x - width / 2,
        y: mark.point.y - mark.radius - 6 - fontSize * 1.2,
        width,
        height: fontSize * 1.2,
      },
      text,
      chart,
      align: 'center',
    }),
    color: config?.highlightLabelColor ?? chart.textColor ?? '#0f172a',
    fontWeight: 'bold',
  };
}

export function renderLineHighlights(context: ChartRenderContext, series: ChartSeries, color: string): RenderNode[] {
  const { chart } = context;
  const config = chart.config;
  const wanted = config?.highlightPoints;
  if (!wanted?.length) {
    return [];
  }
  const pairs = seriesValuePairs(chart, series);
  const points = pixelPoints(context, pairs);
  const nodes: RenderNode[] = [];
  for (const wantedIndex of wanted) {
    const index = wantedIndex < 0 ? points.length + wantedIndex : wantedIndex;
    const point = points[index];
    if (!point) {
      continue;
    }
    const mark: Mark = {
      key: `${chart.id}-${series.id}-${index}`,
      point,
      index,
      radius: config?.highlightSize ?? 6,
      color: config?.highlightColor ?? color,
    };
    if (config?.highlightGuide) {
      nodes.push(guideNode(context, mark));
    }
    nodes.push(dotNode(context, mark));
    if (config?.highlightLabels) {
      nodes.push(labelNode(context, mark, pairs[index][1]));
    }
  }
  return nodes;
}
