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

// Chosen values stand out: a larger dot, a guide down to the axis, and a label above.
export function renderLineHighlights(
  context: ChartRenderContext,
  series: ChartSeries,
  color: string,
): RenderNode[] {
  const { chart, plot, bounds, diagnostics, nextOrder } = context;
  const config = chart.config;
  const wanted = config?.highlightPoints;
  if (!wanted?.length) {
    return [];
  }
  const pairs = seriesValuePairs(chart, series);
  const points = pixelPoints(context, pairs);
  const radius = config?.highlightSize ?? 6;
  const markColor = config?.highlightColor ?? color;
  const glow = config?.lineGlow;
  const fontSize = Math.max(9, chart.fontSize ?? 12);
  const baseline = plot.y + plot.height;
  const nodes: RenderNode[] = [];
  for (const wantedIndex of wanted) {
    const index = wantedIndex < 0 ? points.length + wantedIndex : wantedIndex;
    const point = points[index];
    if (!point) {
      continue;
    }
    const key = `${chart.id}-${series.id}-${index}`;
    if (config?.highlightGuide) {
      nodes.push({
        type: 'path',
        id: `chart-highlight-guide-${key}`,
        order: nextOrder(),
        bounds,
        d: `M ${point.x} ${point.y} V ${baseline}`,
        style: {
          fill: { kind: 'none' },
          stroke: paint(markColor, diagnostics, chart.id),
          strokeWidth: 1,
          dash: [3, 4],
          opacity: 0.55,
          pointerEvents: 'none',
        },
      });
    }
    nodes.push({
      type: 'ellipse',
      id: `chart-highlight-${key}`,
      order: nextOrder(),
      bounds,
      cx: point.x,
      cy: point.y,
      rx: radius,
      ry: radius,
      style: {
        fill: paint(markColor, diagnostics, chart.id),
        shadow: glow ? { color: markColor, opacity: 0.9, blur: glow, dx: 0, dy: 0 } : undefined,
        pointerEvents: 'none',
      },
    });
    if (config?.highlightLabels) {
      const text = formatHighlight(config.highlightLabelFormat, chart.config?.categories?.[index] ?? '', pairs[index][1]);
      const width = Math.max(48, text.length * fontSize * 0.62);
      nodes.push({
        ...chartText({
          id: `chart-highlight-label-${key}`,
          order: nextOrder(),
          bounds,
          frame: { x: point.x - width / 2, y: point.y - radius - 6 - fontSize * 1.2, width, height: fontSize * 1.2 },
          text,
          chart,
          align: 'center',
        }),
        color: config.highlightLabelColor ?? chart.textColor ?? '#0f172a',
        fontWeight: 'bold',
      });
    }
  }
  return nodes;
}
