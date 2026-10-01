import type { Table } from '../../model/table';
import type { RenderNode } from '../scene';
import { renderTableBorders } from './borders';
import { renderTableColumns } from './columns';
import { renderTableFills } from './fills';
import { createTableRenderContext } from './layout';
import { renderTableRules } from './rules';

export function buildTable(table: Table, index: number): RenderNode[] {
  if (table.isVisible === false) {
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
