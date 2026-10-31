import type { Frame } from '../../../model/frame';
import type { SflCanvasObject } from '../../../sflSemantic/sflToCanvasState';
import { dashArray, FONT_WEIGHTS, LABEL_POSITIONS, numOf, oneOf } from './values';

export function frameObject(e: SflCanvasObject): Frame {
  const p = e.props;
  // A screen is only its area: no color, line, name or shadow unless the code gives them.
  const screen = e.kind === 'screen';
  return {
    id: e.id,
    title: e.text ?? null,
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    fillColor: p.fill ?? (screen ? 'rgba(0, 0, 0, 0)' : 'rgba(155, 66, 223, 0.05)'),
    strokeColor: p.stroke ?? (screen ? 'rgba(0, 0, 0, 0)' : '#9b42df'),
    strokeWidth: numOf(p.strokeWidth) ?? (screen ? 0 : 2),
    cornerRadius: numOf(p.cornerRadius) ?? (screen ? 0 : 12),
    textColor: p.textColor ?? '#ffffff',
    fontSize: numOf(p.fontSize) ?? 14,
    fontWeight: oneOf(p.fontWeight, FONT_WEIGHTS, 'bold'),
    fontFamily: p.fontFamily,
    dash: dashArray(p.dash),
    showLabel: screen ? p.showLabel === 'true' : p.showLabel !== 'false',
    labelPosition: oneOf(p.labelPosition, LABEL_POSITIONS, 'top'),
    shadow: screen ? p.shadow === 'true' : p.shadow !== 'false',
    clip: p.clip === 'true' || undefined,
    order: e.order,
    sourceIndex: e.sourceIndex,
  };
}
