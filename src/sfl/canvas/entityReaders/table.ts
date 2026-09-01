import type { SflBlock, SflValue } from '../../ast';
import { childBlocks, directProperties } from '../blockEntries';
import type { SflEntityOut } from '../types';
import { asNumber, asString } from '../valueAccess';

type Properties = Map<string, SflValue>;
type LayoutProp = (block: SflBlock, key: string) => SflValue | undefined;
type TableData = NonNullable<SflEntityOut['table']>;
type Columns = TableData['columns'];

function readCells(block: SflBlock, columns: Columns): Record<string, string | boolean> {
  const props = directProperties(block);
  return Object.fromEntries(
    columns.map(column => {
      const value = asString(props.get(column.id));
      return [column.id, column.type === 'boolean' ? value === 'true' : (value ?? '')];
    }),
  );
}

function readBlockTable(block: SflBlock): TableData | undefined {
  const columnsBlock = childBlocks(block).find(child => child.kind === 'Columns');
  if (!columnsBlock) return undefined;

  const columns: Columns = childBlocks(columnsBlock)
    .filter(child => child.kind === 'Column')
    .map(column => {
      const props = directProperties(column);
      const type = asString(props.get('cellType'));
      const align = asString(props.get('align'));
      return {
        id: column.name,
        label: asString(props.get('text')) ?? column.name,
        width: asNumber(props.get('width')) ?? 120,
        type: type === 'boolean' ? 'boolean' : type === 'number' ? 'number' : 'text',
        align: align === 'left' || align === 'center' || align === 'right' ? align : undefined,
        scale: asString(props.get('scale')),
      };
    });
  const rowsBlock = childBlocks(block).find(child => child.kind === 'Rows');
  const footerBlock = childBlocks(block).find(child => child.kind === 'Footer');
  return {
    columns,
    rows: rowsBlock
      ? childBlocks(rowsBlock)
          .filter(child => child.kind === 'Row')
          .map(row => ({ id: row.name, cells: readCells(row, columns) }))
      : [],
    footer: footerBlock ? { id: footerBlock.name, cells: readCells(footerBlock, columns) } : undefined,
  };
}

function readLegacyTable(props: Properties): TableData | undefined {
  const columnsValue = props.get('columns');
  if (columnsValue?.type !== 'list') return undefined;
  const columns: Columns = columnsValue.values.flatMap((value, index) => {
    if (value.type !== 'list') return [];
    const label = asString(value.values[0]);
    const width = asNumber(value.values[1]);
    const type = asString(value.values[2]);
    return label === undefined || width === undefined
      ? []
      : [{ id: `col-${index + 1}`, label, width, type: type === 'boolean' ? ('boolean' as const) : ('text' as const) }];
  });
  const rowsValue = props.get('rows');
  const rows =
    rowsValue?.type === 'list'
      ? rowsValue.values.flatMap((value, rowIndex) => {
          if (value.type !== 'list') return [];
          const cells = Object.fromEntries(
            columns.map((column, index) => {
              const text = asString(value.values[index]);
              return [column.id, column.type === 'boolean' ? text === 'true' : (text ?? '')];
            }),
          );
          return [{ id: `row-${rowIndex + 1}`, cells }];
        })
      : [];
  return { columns, rows };
}

export function readTable(
  block: SflBlock,
  props: Properties,
  layoutProp: LayoutProp,
  presentation: Record<string, string>,
): SflEntityOut['table'] {
  const rowHeight = asNumber(layoutProp(block, 'rowHeight'));
  if (rowHeight !== undefined) presentation.rowHeight = String(rowHeight);
  return readBlockTable(block) ?? readLegacyTable(props);
}
