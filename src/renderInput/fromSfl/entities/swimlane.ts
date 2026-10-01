import { decodeShadow } from '../../../sfl/decodeStyles';
import type { SflEntityOut } from '../../../sfl/sflToCanvasState';
import { dashArray, FONT_WEIGHTS, numOf, oneOf } from './values';

export function swimlaneObject(e: SflEntityOut) {
  const p = e.props;
  return {
    id: e.id,
    type: 'swimlane',
    title: e.text ?? null,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    orientation: e.swimlane?.orientation ?? 'horizontal',
    lanes: e.swimlane?.lanes ?? [],
    fill_color: p.fill ?? 'rgba(107, 114, 128, 0.05)',
    stroke_color: p.stroke ?? '#6b7280',
    stroke_width: numOf(p.strokeWidth) ?? 2,
    corner_radius: numOf(p.cornerRadius) ?? 12,
    dash: dashArray(p.dash),
    shadow_style: decodeShadow(p.shadow),
    text_color: p.textColor ?? '#6b7280',
    font_size: numOf(p.fontSize) ?? 22,
    font_weight: oneOf(p.fontWeight, FONT_WEIGHTS, 'bold'),
    font_family: p.fontFamily,
    show_lane_labels: p.showLaneLabels !== 'false',
    order: e.order,
  };
}
