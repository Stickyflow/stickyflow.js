import type { SflEntityOut } from '../../sflToCanvasState';
import { numOf, safeJson } from './values';

export function swimlaneObject(e: SflEntityOut): any {
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
    fill_color: p.fill ?? 'transparent',
    stroke_color: p.stroke ?? '#6b7280',
    stroke_width: numOf(p.strokeWidth) ?? 2,
    corner_radius: numOf(p.cornerRadius) ?? 12,
    dash: p.dash ? safeJson(p.dash) : undefined,
    text_color: p.textColor ?? '#6b7280',
    font_size: numOf(p.fontSize) ?? 22,
    font_weight: p.fontWeight ?? 'bold',
    font_family: p.fontFamily,
    show_lane_labels: p.showLaneLabels !== 'false',
    order: e.order,
  };
}
