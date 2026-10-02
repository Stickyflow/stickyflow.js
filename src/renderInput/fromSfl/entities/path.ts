import type { FreeformPath } from '../../../model/path';
import type { SflEntityOut } from '../../../sflSemantic/sflToCanvasState';
import { dashArray, numOf, oneOf, PATH_MARKERS, solidColor } from './values';

export function pathObject(e: SflEntityOut): FreeformPath {
  const p = e.props;
  return {
    id: e.id,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    points: e.path?.points ?? [],
    value: e.path?.value,
    tension: e.path?.tension ?? 0,
    startMarker: oneOf(e.path?.startMarker, PATH_MARKERS, 'none'),
    endMarker: oneOf(e.path?.endMarker, PATH_MARKERS, 'none'),
    closed: e.path?.closed ?? false,
    strokeColor: solidColor(p.stroke) ?? '#7c3aed',
    strokeWidth: numOf(p.strokeWidth) ?? 2,
    dash: dashArray(p.dash) ?? [],
    opacity: numOf(p.opacity) ?? 1,
    fillColor: solidColor(p.fill) ?? 'transparent',
    order: e.order,
  };
}
