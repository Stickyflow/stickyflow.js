import { decodeRamp } from '../../../sfl/decodeStyles';
import type { SflEntityOut } from '../../../sfl/sflToCanvasState';
import type { RenderInputTable, TablePropertyPaths } from '../../types';
import { BORDER_STYLES, dashArray, FONT_WEIGHTS, numOf, oneOf } from './values';

export function tableObject(e: SflEntityOut): RenderInputTable {
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
    propertyPaths: tablePropertyPaths(e),
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

function tablePropertyPaths(e: SflEntityOut): TablePropertyPaths | undefined {
  const table = e.table;
  if (!table) {
    return undefined;
  }
  const header = table.columnsBlockName
    ? Object.fromEntries(
        table.columns.map(column => [column.id, `Columns[${table.columnsBlockName}].Column[${column.id}].text`]),
      )
    : {};
  const body = table.rowsBlockName
    ? Object.fromEntries(
        table.rows.map(row => [
          row.id,
          Object.fromEntries(
            table.columns.map(column => [column.id, `Rows[${table.rowsBlockName}].Row[${row.id}].${column.id}`]),
          ),
        ]),
      )
    : {};
  const footer = table.footerBlockName
    ? Object.fromEntries(table.columns.map(column => [column.id, `Footer[${table.footerBlockName}].${column.id}`]))
    : {};
  return { header, body, footer };
}
