import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import { chartText } from '../../primitives';
import type { ChartRenderContext } from '../types';

export type BarLabelPlacement = 'outside' | 'inside' | 'center';

export interface BarLabelTarget {
  id: string;
  value: number;
  frame: { x: number; y: number; width: number; height: number };
  placement: BarLabelPlacement;
}

const PILL_PAD_X = 8;
const PILL_PAD_Y = 3;
const LABEL_GAP = 4;

function formatValue(value: number, template: string | undefined): string {
  const text = String(Math.round(value * 100) / 100);
  return (template ?? '{value}').replace('{value}', text);
}

function pillPath(x: number, y: number, width: number, height: number): string {
  const r = height / 2;
  return (
    `M ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} ` +
    `H ${x + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
  );
}

export function barLabelsEnabled(context: ChartRenderContext): boolean {
  return context.chart.config?.showBarLabels === true;
}

export function createBarLabelNodes(context: ChartRenderContext, target: BarLabelTarget): RenderNode[] {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const config = chart.config;
  const fontSize = Math.max(8, finite(config?.barLabelFontSize, finite(chart.fontSize, 12)));
  const text = formatValue(target.value, config?.barLabelFormat);
  const pill = config?.barLabelPill === true;
  const padX = pill ? PILL_PAD_X : 0;
  const padY = pill ? PILL_PAD_Y : 0;
  const lineHeight = fontSize * 1.2;
  const width = text.length * fontSize * 0.58 + padX * 2;
  const height = lineHeight + padY * 2;
  const { x, y, width: barWidth, height: barHeight } = target.frame;

  const fits = barHeight >= height + LABEL_GAP * 2;
  const placement = target.placement !== 'outside' && !fits ? 'outside' : target.placement;
  const top =
    placement === 'outside'
      ? y - height - LABEL_GAP
      : placement === 'inside'
        ? y + LABEL_GAP
        : y + barHeight / 2 - height / 2;
  const left = x + barWidth / 2 - width / 2;
  const color = config?.barLabelColor ?? chart.textColor ?? '#0f172a';

  const nodes: RenderNode[] = [];
  if (pill) {
    const borderWidth = finite(config?.barLabelBorderWidth, 1);
    nodes.push({
      type: 'path',
      id: `${target.id}-pill`,
      order: nextOrder(),
      bounds,
      d: pillPath(left, top, width, height),
      style: {
        fill: config?.barLabelPillColor ? paint(config.barLabelPillColor, diagnostics, chart.id) : { kind: 'none' },
        stroke: paint(config?.barLabelBorderColor ?? color, diagnostics, chart.id),
        strokeWidth: borderWidth,
        pointerEvents: 'none',
      },
    });
  }
  nodes.push({
    ...chartText({
      id: target.id,
      order: nextOrder(),
      bounds,
      frame: { x: left, y: top + padY, width, height: lineHeight },
      text,
      chart,
      align: 'center',
    }),
    mark: `bar-label|${placement}|${config?.barLabelFormat ?? ''}`,
    color,
    fontSize,
    fontFamily: config?.barLabelFontFamily ?? chart.fontFamily ?? 'Inter, sans-serif',
    fontWeight: config?.barLabelFontWeight ?? 'normal',
  });
  return nodes;
}
