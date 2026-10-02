import type { Frame } from '../../../model/frame';
import type { SflEntityOut } from '../../../sflSemantic/sflToCanvasState';
import { dashArray, FONT_WEIGHTS, LABEL_POSITIONS, numOf, oneOf } from './values';

export function frameObject(e: SflEntityOut): Frame {
  const p = e.props;
  return {
    id: e.id,
    title: e.text ?? null,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    fillColor: p.fill ?? 'rgba(155, 66, 223, 0.05)',
    strokeColor: p.stroke ?? '#9b42df',
    strokeWidth: numOf(p.strokeWidth) ?? 2,
    cornerRadius: numOf(p.cornerRadius) ?? 12,
    textColor: p.textColor ?? '#ffffff',
    fontSize: numOf(p.fontSize) ?? 14,
    fontWeight: oneOf(p.fontWeight, FONT_WEIGHTS, 'bold'),
    fontFamily: p.fontFamily,
    dash: dashArray(p.dash),
    showLabel: p.showLabel !== 'false',
    labelPosition: oneOf(p.labelPosition, LABEL_POSITIONS, 'top'),
    shadow: p.shadow !== 'false',
    order: e.order,
  };
}
