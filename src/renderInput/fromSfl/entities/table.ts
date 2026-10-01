import type { Table } from '../../../model/table';
import { decodeRamp } from '../../../sfl/decodeStyles';
import type { SflEntityOut } from '../../../sfl/sflToCanvasState';
import { BORDER_STYLES, dashArray, FONT_WEIGHTS, numOf, oneOf } from './values';

export function tableObject(e: SflEntityOut): Table {
  const p = e.props;
  return {
    id: e.id,
    title: e.text ?? 'Table',
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height,
    columns: (e.table?.columns ?? []).map(column => ({ ...column, scale: decodeRamp(column.scale) })),
    rows: e.table?.rows ?? [],
    footer: e.table?.footer,
    columnsBlockName: e.table?.columnsBlockName,
    rowsBlockName: e.table?.rowsBlockName,
    footerBlockName: e.table?.footerBlockName,
    showHeader: p.showHeader !== 'false',
    rowHeight: numOf(p.rowHeight),
    headerFillColor: p.headerFill ?? '#f1f5f9',
    gridColor: p.gridColor ?? '#cbd5e1',
    gridWidth: numOf(p.gridWidth) ?? 1,
    borderStyle: oneOf(p.borderStyle, BORDER_STYLES, 'single'),
    headerRuleStyle: oneOf(p.headerRuleStyle, BORDER_STYLES, 'single'),
    fontFamily: p.fontFamily ?? 'Inter',
    showHorizontalLines: p.showHorizontalLines !== 'false',
    showVerticalLines: p.showVerticalLines !== 'false',
    fillColor: p.fill ?? '#ffffff',
    strokeColor: p.stroke ?? '#475569',
    strokeWidth: numOf(p.strokeWidth) ?? 1,
    cornerRadius: numOf(p.cornerRadius) ?? 12,
    textColor: p.textColor ?? '#0f172a',
    fontSize: numOf(p.fontSize) ?? 14,
    fontWeight: oneOf(p.fontWeight, FONT_WEIGHTS, 'bold'),
    dash: dashArray(p.dash),
    order: e.order,
  };
}
