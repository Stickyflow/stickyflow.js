import type { Chart } from '../../model/charts';
import { chartText, mapChartValue } from '../chartPrimitives';
import { finite } from '../renderPrimitives';
import type { Bounds, RenderNode } from '../scene';

export function buildChartRules(
  chart: Chart,
  plot: { x: number; y: number; width: number; height: number },
  bounds: Bounds,
  order: number,
): RenderNode[] {
  const rules = chart.rules;
  if (!rules?.length) {
    return [];
  }
  const nodes: RenderNode[] = [];
  let offset = 0;
  const fontSize = Math.max(9, finite(chart.font_size, 12) - 2);
  rules.forEach(rule => {
    const color = rule.color || chart.stroke_color || '#475569';
    const y = plot.y + plot.height - mapChartValue(rule.at, chart.axis_y, plot.height);
    nodes.push({
      type: 'path',
      id: `chart-rule-${chart.id}-${rule.id}`,
      order: order + offset++,
      bounds,
      d: `M ${plot.x} ${y} L ${plot.x + plot.width} ${y}`,
      style: {
        fill: { kind: 'none' },
        stroke: { kind: 'solid', color },
        strokeWidth: rule.stroke_width ?? 1,
        dash: rule.dash,
      },
    });
    if (rule.text) {
      nodes.push({
        ...chartText({
          id: `chart-rule-label-${chart.id}-${rule.id}`,
          order: order + offset++,
          bounds,
          frame: { x: plot.x + 4, y: y - fontSize - 2, width: 160, height: fontSize + 2 },
          text: rule.text,
          chart,
        }),
        color,
      });
    }
  });
  return nodes;
}
