import type { TypedChart } from '../../../model/chart';
import type { RenderNode } from '../../scene';
import { finite } from '../../scene';
import { barCategoryCount, chartText, labelBelowFrame, labelTilt } from '../primitives';
import { categoryProp, seriesLabelProp } from '../propPath';
import { type ChartLayout, tickOffset } from './layout';

function categoryLabels(chart: TypedChart, count: number): string[] {
  if (chart.config?.categories?.length) {
    return chart.config.categories;
  }
  return Array.from({ length: count }, (_value, index) => String(index + 1));
}

export function buildCategoricalXAxisTicks(chart: TypedChart, layout: ChartLayout, order: number): RenderNode[] {
  const count = barCategoryCount(chart);
  const slotWidth = layout.plot.width / count;
  const labels = categoryLabels(chart, count);

  const editable = Boolean(chart.config?.categories?.length);
  const tilt = labelTilt(chart);
  const left = chart.categoryAlign === 'left';
  const groupGap = left
    ? Math.min(
        Math.max(0, finite((chart.config as { barGroupGap?: number } | undefined)?.barGroupGap, 8)),
        Math.max(0, slotWidth - 1),
      )
    : 0;

  return Array.from({ length: count }, (_value, index) => {
    const centerX = layout.plot.x + (index + 0.5) * slotWidth;
    if (tilt > 0) {
      const text = labels[index] ?? String(index + 1);
      const { frame, rotation } = labelBelowFrame(chart, text, tilt, { x: centerX, y: layout.plot.y + layout.plot.height + 4 + tickOffset(chart) });
      return {
        ...chartText({ role: 'axis', id: `chart-x-tick-${chart.id}-${index}`, order: order + index, bounds: layout.bounds, frame, text, chart, align: 'right', rotation }),
        prop: editable ? categoryProp(index) : undefined,
      };
    }
    return {
      ...chartText({
        role: 'axis',
        id: `chart-x-tick-${chart.id}-${index}`,
        order: order + index,
        bounds: layout.bounds,
        frame: {
          x: left ? layout.plot.x + index * slotWidth + groupGap / 2 : centerX - slotWidth / 2,
          y: layout.plot.y + layout.plot.height + 4 + tickOffset(chart),
          width: left ? slotWidth - groupGap : slotWidth,
          height: 18,
        },
        text: labels[index] ?? String(index + 1),
        chart,
        align: left ? 'left' : 'center',
      }),
      prop: editable ? categoryProp(index) : undefined,
    };
  });
}

export function buildSeriesXAxisTicks(chart: TypedChart, layout: ChartLayout, order: number): RenderNode[] {
  const count = Math.max(1, chart.series.length);
  const slotWidth = layout.plot.width / count;
  const tilt = labelTilt(chart);

  return chart.series.map((series, index) => {
    const centerX = layout.plot.x + (index + 0.5) * slotWidth;
    if (tilt > 0) {
      const text = series.label || series.id;
      const { frame, rotation } = labelBelowFrame(chart, text, tilt, { x: centerX, y: layout.plot.y + layout.plot.height + 4 + tickOffset(chart) });
      return {
        ...chartText({ role: 'axis', id: `chart-x-tick-${chart.id}-${index}`, order: order + index, bounds: layout.bounds, frame, text, chart, align: 'right', rotation }),
        prop: seriesLabelProp(series.id),
      };
    }
    return {
      ...chartText({
        role: 'axis',
        id: `chart-x-tick-${chart.id}-${index}`,
        order: order + index,
        bounds: layout.bounds,
        frame: {
          x: centerX - slotWidth / 2,
          y: layout.plot.y + layout.plot.height + 4 + tickOffset(chart),
          width: slotWidth,
          height: 18,
        },
        text: series.label || series.id,
        chart,
        align: 'center',
      }),
      prop: seriesLabelProp(series.id),
    };
  });
}
