import type { ChartSeries } from '../../../../model/charts';
import type { SceneText } from '../../../scene';
import { finite } from '../../../scene';
import { contrastTextColor, representativeColor } from '../../primitives';
import type { ChartRenderContext } from '../types';
import { pieArcPoint } from './geometry';
import type { PieGeometry } from './types';

const MIN_LABEL_SWEEP = (14 * Math.PI) / 180;
const LABEL_WIDTH = 80;
const LABEL_RADIUS_FRACTION = 0.62;

export interface PieLabelMark {
  seriesId: string;
  label: string;
  color: NonNullable<ChartSeries['color']>;
  share: number;
  start: number;
  end: number;
}

export function renderPieLabels(
  context: ChartRenderContext,
  geometry: PieGeometry,
  marks: PieLabelMark[],
): SceneText[] {
  if (context.chart.show_axis_labels === false) {
    return [];
  }
  return marks
    .filter(mark => mark.end - mark.start >= MIN_LABEL_SWEEP)
    .map(mark => createPieLabel(context, geometry, mark));
}

function createPieLabel(context: ChartRenderContext, geometry: PieGeometry, mark: PieLabelMark): SceneText {
  const { chart, bounds, nextOrder } = context;
  const mid = (mark.start + mark.end) / 2;
  const labelRadius = geometry.innerRadius + (geometry.outerRadius - geometry.innerRadius) * LABEL_RADIUS_FRACTION;
  const point = pieArcPoint(geometry, mid, labelRadius);
  const fontSize = Math.max(9, finite(chart.font_size, 12) - 1);
  const percent = Math.round(mark.share * 100);
  return {
    type: 'text',
    id: `chart-pie-label-${chart.id}-${mark.seriesId}`,
    order: nextOrder(),
    bounds,
    x: point.x - LABEL_WIDTH / 2,
    y: point.y - fontSize,
    width: LABEL_WIDTH,
    height: fontSize * 1.2 * 2,
    lines: [mark.label, `${percent}%`],
    fontFamily: chart.font_family ?? 'Inter',
    fontSize,
    fontWeight: 'normal',
    color: contrastTextColor(representativeColor(mark.color, '#0f172a')),
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
  };
}
