import type { RenderInputTable } from '../../renderInput/types';
import type { RenderNode } from '../scene';
import { tag } from '../scene/tagging';
import { buildTable } from './buildTable';

export function buildTables(tables: readonly RenderInputTable[]): RenderNode[] {
  return tables.flatMap((table, index) =>
    tag(buildTable(table, index), 'table', table.id, undefined, table.title ?? undefined),
  );
}
