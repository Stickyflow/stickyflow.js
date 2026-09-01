import type { SflEntityOut } from '../../sflToCanvasState';
import { decodeColor } from '../decodeStyles';
import { numOf, safeJson } from './values';

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
    start_marker: e.path?.startMarker ?? 'none',
    end_marker: e.path?.endMarker ?? 'none',
    closed: e.path?.closed ?? false,
    stroke_color: decodeColor(p.stroke) ?? '#7c3aed',
    stroke_width: numOf(p.strokeWidth) ?? 2,
    dash: p.dash ? safeJson(p.dash) : [],
    opacity: numOf(p.opacity) ?? 1,
    fill_color: decodeColor(p.fill) ?? 'transparent',
    order: e.order,
  };
}
