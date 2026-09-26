import type { ChartSeries } from '../../../../model/charts';
import type { RenderNode, SceneText } from '../../../scene';
import { DEFAULT_FONT, finite } from '../../../scene';
import { contrastTextColor, representativeColor, sameHueTint } from '../../primitives';
import type { ChartRenderContext } from '../types';
import { pieArcPoint } from './geometry';
import type { PieGeometry } from './types';

const MIN_LABEL_SWEEP = (14 * Math.PI) / 180;
const LABEL_WIDTH = 80;
const LABEL_RADIUS_FRACTION = 0.62;
const OUTSIDE_GAP = 14;
const LEADER_INSET = 3;
const OUTSIDE_TINT_LIGHTNESS = 0.32;
const OUTSIDE_FALLBACK_COLOR = '#334155';

export interface PieLabelMark {
  seriesId: string;
  label: string;
  color: NonNullable<ChartSeries['color']>;
  share: number;
  start: number;
  end: number;
  labelPulled: boolean;
}

export function renderPieLabels(
  context: ChartRenderContext,
  geometry: PieGeometry,
  marks: PieLabelMark[],
): RenderNode[] {
  if (context.chart.show_axis_labels === false) {
    return [];
  }
  return marks
    .filter(mark => mark.end - mark.start >= MIN_LABEL_SWEEP)
    .flatMap(mark => createPieLabel(context, geometry, mark));
}

function createPieLabel(context: ChartRenderContext, geometry: PieGeometry, mark: PieLabelMark): RenderNode[] {
  const { chart, bounds, nextOrder } = context;
  const mid = (mark.start + mark.end) / 2;
  const fontSize = Math.max(9, finite(chart.font_size, 12));
  const percent = Math.round(mark.share * 100);
  const richLines = [[{ text: mark.label, bold: true }], [{ text: `${percent}%`, bold: false }]];
  const textBase = {
    type: 'text' as const,
    id: `chart-pie-label-${chart.id}-${mark.seriesId}`,
    order: nextOrder(),
    bounds,
    width: LABEL_WIDTH,
    height: fontSize * 1.2 * 2,
    detail: {
      of: 'chartSeries' as const,
      series: mark.seriesId,
      mark: 'pie-label',
      pulled: mark.labelPulled || undefined,
    },
    lines: [mark.label, `${percent}%`],
    richLines,
    fontFamily: chart.font_family ?? DEFAULT_FONT,
    fontSize,
    fontWeight: 'normal' as const,
    align: 'center' as const,
    verticalAlign: 'middle' as const,
    lineHeight: 1.2,
  };

  const ringThickness = geometry.outerRadius - geometry.innerRadius;
  if (mark.labelPulled || ringThickness < fontSize * 1.2 * 2 + 6) {
    const anchorRadius = geometry.outerRadius + OUTSIDE_GAP;
    const point = pieArcPoint(geometry, mid, anchorRadius);
    const tickStart = pieArcPoint(geometry, mid, geometry.outerRadius + LEADER_INSET);
    const tickEnd = pieArcPoint(geometry, mid, anchorRadius - LEADER_INSET);
    const color =
      sameHueTint(representativeColor(mark.color, OUTSIDE_FALLBACK_COLOR), OUTSIDE_TINT_LIGHTNESS) ??
      OUTSIDE_FALLBACK_COLOR;
    const tick: RenderNode = {
      type: 'path',
      id: `chart-pie-label-tick-${chart.id}-${mark.seriesId}`,
      order: nextOrder(),
      bounds,
      d: `M ${tickStart.x} ${tickStart.y} L ${tickEnd.x} ${tickEnd.y}`,
      style: { stroke: { kind: 'solid', color }, strokeWidth: 1.5 },
    };
    const text: SceneText = { ...textBase, x: point.x - LABEL_WIDTH / 2, y: point.y - fontSize, color };
    return [tick, text];
  }

  const labelRadius = geometry.innerRadius + ringThickness * LABEL_RADIUS_FRACTION;
  const point = pieArcPoint(geometry, mid, labelRadius);
  const color = contrastTextColor(representativeColor(mark.color, '#0f172a'));
  const text: SceneText = { ...textBase, x: point.x - LABEL_WIDTH / 2, y: point.y - fontSize, color };
  return [text];
}
