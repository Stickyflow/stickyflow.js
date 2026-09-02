import type { SflBlock, SflValue } from '../../ast';
import { childBlocks, directProperties } from '../blockEntries';
import type { SflEntityOut } from '../types';
import { asNumber, asString } from '../valueAccess';

type Properties = Map<string, SflValue>;
type LayoutProp = (block: SflBlock, key: string) => SflValue | undefined;
type TableData = NonNullable<SflEntityOut['table']>;
type Columns = TableData['columns'];
type Column = Columns[number];
type Cells = TableData['rows'][number]['cells'];
type ListValue = Extract<SflValue, { type: 'list' }>;

function readCellValue(column: Column, value: SflValue | undefined): string | boolean {
  const text = asString(value);
  return column.type === 'boolean' ? text === 'true' : (text ?? '');
}

function readBlockCells(block: SflBlock, columns: Columns): Cells {
  const props = directProperties(block);
  return Object.fromEntries(columns.map(column => [column.id, readCellValue(column, props.get(column.id))]));
}

function readBlockTable(block: SflBlock): TableData | undefined {
  const columnsBlock = childBlocks(block).find(child => child.kind === 'Columns');
  if (!columnsBlock) {
    return undefined;
  }

  const columns = readBlockColumns(columnsBlock);
  const rowsBlock = childBlocks(block).find(child => child.kind === 'Rows');
  const footerBlock = childBlocks(block).find(child => child.kind === 'Footer');
  return {
    columns,
    rows: rowsBlock ? readBlockRows(rowsBlock, columns) : [],
    footer: footerBlock ? { id: footerBlock.name, cells: readBlockCells(footerBlock, columns) } : undefined,
  };
}

function readBlockColumns(columnsBlock: SflBlock): Columns {
  return childBlocks(columnsBlock)
    .filter(child => child.kind === 'Column')
    .map(readBlockColumn);
}

function readBlockColumn(block: SflBlock): Column {
  const props = directProperties(block);
  const type = asString(props.get('cellType'));
  const align = asString(props.get('align'));
  return {
    id: block.name,
    label: asString(props.get('text')) ?? block.name,
    width: asNumber(props.get('width')) ?? 120,
    type: type === 'boolean' ? 'boolean' : type === 'number' ? 'number' : 'text',
    align: align === 'left' || align === 'center' || align === 'right' ? align : undefined,
    scale: asString(props.get('scale')),
  };
}

function readBlockRows(rowsBlock: SflBlock, columns: Columns): TableData['rows'] {
  return childBlocks(rowsBlock)
    .filter(child => child.kind === 'Row')
    .map(row => ({ id: row.name, cells: readBlockCells(row, columns) }));
}

function readLegacyTable(props: Properties): TableData | undefined {
  const columnsValue = props.get('columns');
  if (columnsValue?.type !== 'list') {
    return undefined;
  }
  const columns = readLegacyColumns(columnsValue);
  return { columns, rows: readLegacyRows(props.get('rows'), columns) };
}

function readLegacyColumns(value: ListValue): Columns {
  return value.values.flatMap((column, index) => {
    const parsed = column.type === 'list' ? readLegacyColumn(column, index) : null;
    return parsed ? [parsed] : [];
  });
}

function readLegacyColumn(value: ListValue, index: number): Column | null {
  const label = asString(value.values[0]);
  const width = asNumber(value.values[1]);
  if (label === undefined || width === undefined) {
    return null;
  }
  return {
    id: `col-${index + 1}`,
    label,
    width,
    type: asString(value.values[2]) === 'boolean' ? 'boolean' : 'text',
  };
}

function readLegacyRows(value: SflValue | undefined, columns: Columns): TableData['rows'] {
  if (value?.type !== 'list') {
    return [];
  }
  return value.values.flatMap((row, rowIndex) => {
    if (row.type !== 'list') {
      return [];
    }
    const cells = Object.fromEntries(
      columns.map((column, columnIndex) => [column.id, readCellValue(column, row.values[columnIndex])]),
    );
    return [{ id: `row-${rowIndex + 1}`, cells }];
  });
}

export function readTable(
  block: SflBlock,
  props: Properties,
  layoutProp: LayoutProp,
  presentation: Record<string, string>,
): SflEntityOut['table'] {
  const rowHeight = asNumber(layoutProp(block, 'rowHeight'));
  if (rowHeight !== undefined) {
    presentation.rowHeight = String(rowHeight);
  }
  return readBlockTable(block) ?? readLegacyTable(props);
}
