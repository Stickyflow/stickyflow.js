import type { Chart, ChartSeries } from '../../../model/chart';
import { finite } from '../../scene';
import { barCategoryCount } from './barCategories';

export const CATEGORY_LABEL_ROW = 18;

interface BarSettings {
  categories?: string[];
  barGroupGap?: number;
  barThickness?: number;
  orientation?: string;
}

const settings = (chart: Chart): BarSettings | undefined => chart.config as BarSettings | undefined;

export function isHorizontalBar(chart: Chart): boolean {
  return chart.chartType === 'bar' && settings(chart)?.orientation === 'horizontal';
}

export interface HorizontalRows {
  count: number;
  slotHeight: number;
  groupGap: number;
  // Height reserved above a bar for its category label (labels left-aligned above the bars).
  labelRow: number;
  barsHeight: number;
  // Shifts a thin bar block to the middle of its row.
  offset: number;
}

export function horizontalRows(chart: Chart, plot: { height: number }): HorizontalRows {
  const count = barCategoryCount({ series: chart.series as ChartSeries[], config: settings(chart) });
  const slotHeight = plot.height / count;
  const groupGap = Math.min(Math.max(0, finite(settings(chart)?.barGroupGap, 8)), Math.max(0, slotHeight - 1));
  const labelRow = chart.categoryAlign === 'left' ? CATEGORY_LABEL_ROW : 0;
  const available = Math.max(1, slotHeight - groupGap - labelRow);
  const thickness = finite(settings(chart)?.barThickness, 0);
  const barsHeight = thickness > 0 ? Math.min(available, thickness) : available;
  return { count, slotHeight, groupGap, labelRow, barsHeight, offset: (available - barsHeight) / 2 };
}

export function rowTop(rows: HorizontalRows, plot: { y: number }, index: number): number {
  return plot.y + index * rows.slotHeight + rows.groupGap / 2 + rows.offset;
}
