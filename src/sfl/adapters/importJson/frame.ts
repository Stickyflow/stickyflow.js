import type { SflEntityOut } from '../../sflToCanvasState';
import { numOf, safeJson } from './values';

export function frameObject(e: SflEntityOut): any {
  const p = e.props;
  return {
    id: e.id,
    type: 'frame',
    title: e.text ?? null,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    w: e.width,
    h: e.height,
    fill_color: p.fill ?? 'rgba(155, 66, 223, 0.05)',
    stroke_color: p.stroke ?? '#9b42df',
    stroke_width: numOf(p.strokeWidth) ?? 2,
    corner_radius: numOf(p.cornerRadius) ?? 12,
    text_color: p.textColor ?? '#9b42df',
    font_size: numOf(p.fontSize) ?? 14,
    font_weight: p.fontWeight ?? 'bold',
    font_family: p.fontFamily,
    dash: p.dash ? safeJson(p.dash) : undefined,
    show_label: p.showLabel !== 'false',
    order: e.order,
  };
}
