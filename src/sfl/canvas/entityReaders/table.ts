import type { SflBlock, SflValue } from '../../ast';
import type { SflEntityOut } from '../types';
import { asNumber, asString, childBlocks, directProps, numStr } from '../readers';

type Properties = Map<string, SflValue>;
type LayoutProp = (block: SflBlock, key: string) => SflValue | undefined;

export function readTable(block: SflBlock, p: Properties, layoutProp: LayoutProp, props: Record<string, string>): SflEntityOut['table'] {
  let tableData: SflEntityOut['table'];
  
  const columnsBlock = childBlocks(block).find(child => child.kind === 'Columns');
  const rowsBlock = childBlocks(block).find(child => child.kind === 'Rows');
  // §3.6: at most one Footer block, sibling of Rows - read with the same
  // cell logic as a Row (shared readCells() below).
  const footerBlock = childBlocks(block).find(child => child.kind === 'Footer');
  if (columnsBlock) {
    const columns: NonNullable<SflEntityOut['table']>['columns'] = childBlocks(columnsBlock).filter(child => child.kind === 'Column').map(column => {
      const columnProps = directProps(column);
      const cellType = asString(columnProps.get('cellType'));
      const align = asString(columnProps.get('align'));
      return {
        id: column.name,
        label: asString(columnProps.get('text')) ?? column.name,
        width: asNumber(columnProps.get('width')) ?? 120,
        type: cellType === 'boolean' ? 'boolean' as const : cellType === 'number' ? 'number' as const : 'text' as const,
        align: align === 'left' || align === 'center' || align === 'right' ? align : undefined,
        scale: asString(columnProps.get('scale')),
      };
    });
    // Shared by Row and Footer: reads one cell per known column, keyed by
    // column id, coercing a boolean-typed column's value to a real
    // boolean (`number`-typed columns stay strings here - parsed to a
    // number only at render time, same as atlas's TableComponent.tsx).
    const readCells = (cellBlock: SflBlock): Record<string, string | boolean> => {
      const cells: Record<string, string | boolean> = {};
      const cellProps = directProps(cellBlock);
      for (const column of columns) {
        const value = asString(cellProps.get(column.id));
        cells[column.id] = column.type === 'boolean' ? value === 'true' : (value ?? '');
      }
      return cells;
    };
    const rows = rowsBlock
      ? childBlocks(rowsBlock).filter(child => child.kind === 'Row').map(row => ({ id: row.name, cells: readCells(row) }))
      : [];
    const footer = footerBlock ? { id: footerBlock.name, cells: readCells(footerBlock) } : undefined;
    tableData = { columns, rows, footer };
  }
  
  // SFL 1.2 compatibility: accept the old positional nested lists, but
  // the canonical emitter never writes them again.
  const columnsValue = p.get('columns');
  const rowsValue = p.get('rows');
  if (!columnsBlock && columnsValue?.type === 'list') {
    const columns: NonNullable<SflEntityOut['table']>['columns'] = columnsValue.values.flatMap((value, index) => {
      if (value.type !== 'list') return [];
      const label = asString(value.values[0]);
      const width = asNumber(value.values[1]);
      const type = asString(value.values[2]);
      if (label === undefined || width === undefined) return [];
      return [{ id: `col-${index + 1}`, label, width, type: type === 'boolean' ? 'boolean' : 'text' }];
    });
    if (rowsValue?.type === 'list') {
      const rows = rowsValue.values.flatMap((value, rowIndex) => {
        if (value.type !== 'list') return [];
        const cells: Record<string, string | boolean> = {};
        columns.forEach((column, columnIndex) => {
          const cell = value.values[columnIndex];
          cells[column.id] = column.type === 'boolean' ? asString(cell) === 'true' : (asString(cell) ?? '');
        });
        return [{ id: `row-${rowIndex + 1}`, cells }];
      });
      tableData = { columns, rows };
    } else {
      tableData = { columns, rows: [] };
    }
  }
  const rowHeight = asNumber(layoutProp(block, 'rowHeight'));
  if (rowHeight !== undefined) props.rowHeight = numStr(rowHeight);
    
  return tableData;
}

