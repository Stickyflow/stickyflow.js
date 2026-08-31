import type { SflEntityOut } from '../../sflToCanvasState';
import { decodeRamp } from '../decodeStyles';
import { numOf, safeJson } from './values';

export function tableObject(e: SflEntityOut): any {
  const p = e.props;
  return {
    id: e.id,
    type: 'table',
    title: e.text ?? 'Table',
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    columns: (e.table?.columns ?? []).map(column => ({ ...column, scale: decodeRamp(column.scale) })),
    rows: e.table?.rows ?? [],
    footer: e.table?.footer,
    show_header: p.showHeader !== 'false',
    row_height: numOf(p.rowHeight),
    header_fill_color: p.headerFill ?? '#f1f5f9',
    grid_color: p.gridColor ?? '#cbd5e1',
    grid_width: numOf(p.gridWidth) ?? 1,
    border_style: p.borderStyle ?? 'single',
    header_rule_style: p.headerRuleStyle ?? 'single',
    font_family: p.fontFamily ?? 'Inter',
    show_horizontal_lines: p.showHorizontalLines !== 'false',
    show_vertical_lines: p.showVerticalLines !== 'false',
    fill_color: p.fill ?? '#ffffff',
    stroke_color: p.stroke ?? '#475569',
    stroke_width: numOf(p.strokeWidth) ?? 1,
    corner_radius: numOf(p.cornerRadius) ?? 12,
    text_color: p.textColor ?? '#0f172a',
    font_size: numOf(p.fontSize) ?? 14,
    font_weight: p.fontWeight ?? 'bold',
    dash: p.dash ? safeJson(p.dash) : undefined,
    order: e.order,
  };
}
