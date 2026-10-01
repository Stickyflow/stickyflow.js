import type { Swimlane } from '../../../model/swimlane';
import { decodeShadow } from '../../../sfl/decodeStyles';
import type { SflEntityOut } from '../../../sfl/sflToCanvasState';
import { dashArray, FONT_WEIGHTS, numOf, oneOf } from './values';

export function swimlaneObject(e: SflEntityOut): Swimlane {
  const p = e.props;
  return {
    id: e.id,
    title: e.text ?? null,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    orientation: e.swimlane?.orientation ?? 'horizontal',
    lanes: e.swimlane?.lanes ?? [],
    fillColor: p.fill ?? 'rgba(107, 114, 128, 0.05)',
    strokeColor: p.stroke ?? '#6b7280',
    strokeWidth: numOf(p.strokeWidth) ?? 2,
    cornerRadius: numOf(p.cornerRadius) ?? 12,
    dash: dashArray(p.dash),
    shadowStyle: decodeShadow(p.shadow),
    textColor: p.textColor ?? '#6b7280',
    fontSize: numOf(p.fontSize) ?? 22,
    fontWeight: oneOf(p.fontWeight, FONT_WEIGHTS, 'bold'),
    fontFamily: p.fontFamily,
    showLaneLabels: p.showLaneLabels !== 'false',
    order: e.order,
  };
}
