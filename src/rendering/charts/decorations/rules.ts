import type { Chart, ChartRule } from '../../../model/chart';
import type { Bounds, RenderNode } from '../../scene';
import { finite } from '../../scene';
import { chartText, mapChartValue } from '../primitives';
import { ruleAtProp, ruleTextProp } from '../propPath';
import type { ChartLayout } from './layout';

export interface ChartRulesRender {
  chart: Chart;
  plot: ChartLayout['plot'];
  bounds: Bounds;
  order: number;
}

interface ChartRuleMark {
  rule: ChartRule;
  color: string;
  y: number;
  lineOrder: number;
  labelOrder?: number;
}

export function buildChartRules(render: ChartRulesRender): RenderNode[] {
  if (!render.chart.rules?.length) {
    return [];
  }
  return createChartRuleMarks(render).flatMap(mark => renderChartRule(render, mark));
}

function createChartRuleMarks(render: ChartRulesRender): ChartRuleMark[] {
  let nextOrder = render.order;
  return (render.chart.rules ?? []).map(rule => {
    const lineOrder = nextOrder++;
    const labelOrder = rule.text ? nextOrder++ : undefined;
    return {
      rule,
      color: rule.color || render.chart.strokeColor || '#475569',
      y: render.plot.y + render.plot.height - mapChartValue(rule.at, render.chart.axisY, render.plot.height),
      lineOrder,
      labelOrder,
    };
  });
}

function renderChartRule(render: ChartRulesRender, mark: ChartRuleMark): RenderNode[] {
  const nodes = [createChartRuleLine(render, mark)];
  if (mark.rule.text && mark.labelOrder !== undefined) {
    nodes.push(createChartRuleLabel(render, mark));
  }
  return nodes;
}

function createChartRuleLine(render: ChartRulesRender, mark: ChartRuleMark): RenderNode {
  return {
    type: 'path',
    id: `chart-rule-${render.chart.id}-${mark.rule.id}`,
    order: mark.lineOrder,
    bounds: render.bounds,
    d: `M ${render.plot.x} ${mark.y} L ${render.plot.x + render.plot.width} ${mark.y}`,
    prop: ruleAtProp(mark.rule.id),
    propKind: 'value',
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: mark.color },
      strokeWidth: mark.rule.strokeWidth ?? 1,
      dash: mark.rule.dash,
    },
  };
}

function createChartRuleLabel(render: ChartRulesRender, mark: ChartRuleMark): RenderNode {
  const fontSize = Math.max(9, finite(render.chart.fontSize, 12) - 2);
  return {
    ...chartText({
      id: `chart-rule-label-${render.chart.id}-${mark.rule.id}`,
      order: mark.labelOrder ?? mark.lineOrder + 1,
      bounds: render.bounds,
      frame: { x: render.plot.x + 4, y: mark.y - fontSize - 2, width: 160, height: fontSize + 2 },
      text: mark.rule.text ?? '',
      chart: render.chart,
    }),
    color: mark.color,
    prop: ruleTextProp(mark.rule.id),
  };
}
