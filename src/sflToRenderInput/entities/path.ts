import type { SflEntityOut } from '../../sfl/sflToCanvasState';
import { dashArray, numOf, oneOf, PATH_MARKERS, solidColor } from './values';

export function pathObject(e: SflEntityOut) {
  const p = e.props;
  return {
    id: e.id,
    type: 'path',
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    points: e.path?.points ?? [],
    value: e.path?.value,
    tension: e.path?.tension ?? 0,
    start_marker: oneOf(e.path?.startMarker, PATH_MARKERS, 'none'),
    end_marker: oneOf(e.path?.endMarker, PATH_MARKERS, 'none'),
    closed: e.path?.closed ?? false,
    stroke_color: solidColor(p.stroke) ?? '#7c3aed',
    stroke_width: numOf(p.strokeWidth) ?? 2,
    dash: dashArray(p.dash) ?? [],
    opacity: numOf(p.opacity) ?? 1,
    fill_color: solidColor(p.fill) ?? 'transparent',
    order: e.order,
  };
}
