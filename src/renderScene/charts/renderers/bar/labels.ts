import type { RenderNode } from '../../../scene';
import { finite, paint } from '../../../scene';
import { BAR_LABEL, barLabelSize, CATEGORY_LABEL_ROW, chartText, formatBarLabel, pillPath } from '../../primitives';
import type { BarLabelSize } from '../../primitives/barLabel';
import type { ChartRenderContext } from '../types';

export type BarLabelPlacement = 'outside' | 'inside' | 'center' | 'axis';

export interface BarLabelTarget {
  id: string;
  value: number;
  frame: { x: number; y: number; width: number; height: number };
  placement: BarLabelPlacement;
  horizontal?: boolean;
}

interface LabelBox extends BarLabelSize {
  left: number;
  top: number;
}

export function barLabelsEnabled(context: ChartRenderContext): boolean {
  return context.chart.config?.showBarLabels === true;
}

function resolvePlacement(target: BarLabelTarget, size: BarLabelSize): BarLabelPlacement {
  const fits = target.frame.height >= size.height + BAR_LABEL.gap * 2;
  return target.placement !== 'outside' && !fits ? 'outside' : target.placement;
}

function labelTop(placement: BarLabelPlacement, frame: BarLabelTarget['frame'], height: number): number {
  if (placement === 'outside') {
    return frame.y - height - BAR_LABEL.gap;
  }
  return placement === 'inside' ? frame.y + BAR_LABEL.gap : frame.y + frame.height / 2 - height / 2;
}

function createPillNode(context: ChartRenderContext, id: string, box: LabelBox, color: string): RenderNode {
  const { chart, bounds, diagnostics, nextOrder } = context;
  const config = chart.config;
  return {
    type: 'path',
    id: `${id}-pill`,
    order: nextOrder(),
    bounds,
    d: pillPath(box.left, box.top, box.width, box.height),
    style: {
      fill: config?.barLabelPillColor ? paint(config.barLabelPillColor, diagnostics, chart.id) : { kind: 'none' },
      stroke: paint(config?.barLabelBorderColor ?? color, diagnostics, chart.id),
      strokeWidth: finite(config?.barLabelBorderWidth, 1),
      pointerEvents: 'none',
    },
  };
}

function createTextNode(
  context: ChartRenderContext,
  id: string,
  box: LabelBox,
  text: string,
  placement: BarLabelPlacement,
  fontSize: number,
  color: string,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  const config = chart.config;
  return {
    ...chartText({
      id,
      order: nextOrder(),
      bounds,
      frame: { x: box.left, y: box.top + box.padY, width: box.width, height: box.lineHeight },
      text,
      chart,
      align: 'center',
    }),
    mark: `bar-label|${placement}|${config?.barLabelFormat ?? ''}`,
    color,
    fontSize,
    fontFamily: config?.barLabelFontFamily ?? chart.fontFamily ?? 'Inter, sans-serif',
    fontWeight: config?.barLabelFontWeight ?? 'normal',
  };
}

function createAxisValueNode(
  context: ChartRenderContext,
  target: BarLabelTarget,
  text: string,
  fontSize: number,
): RenderNode {
  const { chart, plot, bounds, nextOrder } = context;
  const config = chart.config;
  const top = plot.y + plot.height + 4 + 16 + Math.max(0, chart.tickLength ?? 0);
  return {
    ...chartText({
      id: target.id,
      order: nextOrder(),
      bounds,
      frame: target.horizontal
        ? chart.categoryAlign === 'inside'
          ? {
              x: plot.x,
              y: target.frame.y + target.frame.height / 2 - fontSize * 0.6,
              width: plot.width - 14,
              height: fontSize * 1.2,
            }
          : { x: plot.x, y: target.frame.y - CATEGORY_LABEL_ROW, width: plot.width, height: fontSize * 1.2 }
        : { x: target.frame.x, y: top, width: target.frame.width, height: fontSize * 1.2 },
      text,
      chart,
      align: target.horizontal ? 'right' : chart.categoryAlign === 'left' ? 'left' : 'center',
    }),
    mark: `bar-label|axis|${config?.barLabelFormat ?? ''}`,
    color: config?.barLabelColor ?? chart.textColor ?? '#0f172a',
    fontSize,
    fontFamily: config?.barLabelFontFamily ?? chart.fontFamily ?? 'Inter, sans-serif',
    fontWeight: config?.barLabelFontWeight ?? 'normal',
  };
}

function horizontalPlacement(target: BarLabelTarget, size: BarLabelSize): BarLabelPlacement {
  const requested = target.placement === 'axis' ? 'outside' : target.placement;
  const fits = target.frame.width >= size.width + BAR_LABEL.gap * 2;
  return requested !== 'outside' && !fits ? 'outside' : requested;
}

function horizontalBox(target: BarLabelTarget, size: BarLabelSize, placement: BarLabelPlacement): LabelBox {
  const { frame } = target;
  const left =
    placement === 'outside'
      ? frame.x + frame.width + BAR_LABEL.gap
      : placement === 'inside'
        ? frame.x + frame.width - size.width - BAR_LABEL.gap
        : frame.x + frame.width / 2 - size.width / 2;
  return { ...size, left, top: frame.y + frame.height / 2 - size.height / 2 };
}

export function createBarLabelNodes(context: ChartRenderContext, target: BarLabelTarget): RenderNode[] {
  const { chart } = context;
  const config = chart.config;
  const fontSize = Math.max(8, finite(config?.barLabelFontSize, finite(chart.fontSize, 12)));
  const text = formatBarLabel(target.value, config?.barLabelFormat);
  if (target.placement === 'axis') {
    return [createAxisValueNode(context, target, text, fontSize)];
  }
  const pill = config?.barLabelPill === true;
  const size = barLabelSize(text, fontSize, pill);
  const placement = target.horizontal ? horizontalPlacement(target, size) : resolvePlacement(target, size);
  const box: LabelBox = target.horizontal
    ? horizontalBox(target, size, placement)
    : {
        ...size,
        left: target.frame.x + target.frame.width / 2 - size.width / 2,
        top: labelTop(placement, target.frame, size.height),
      };
  const color = config?.barLabelColor ?? chart.textColor ?? '#0f172a';

  const nodes: RenderNode[] = [];
  if (pill) {
    nodes.push(createPillNode(context, target.id, box, color));
  }
  nodes.push(createTextNode(context, target.id, box, text, placement, fontSize, color));
  return nodes;
}
