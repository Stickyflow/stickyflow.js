import type { Table } from '../../model/tables';
import type { RenderNode } from '../renderScene';
import { renderTableBorders } from './table/borders';
import { renderTableColumns } from './table/columns';
import { renderTableFills } from './table/fills';
import { createTableRenderContext } from './table/layout';
import { renderTableRules } from './table/rules';

export function buildTable(table: Table, index: number): RenderNode[] {
  if (table.is_visible === false) {
    return [];
  }
  const context = createTableRenderContext(table, index);
  return [
    ...renderTableFills(context),
    ...renderTableColumns(context),
    ...renderTableRules(context),
    ...renderTableBorders(context),
  ];
}
