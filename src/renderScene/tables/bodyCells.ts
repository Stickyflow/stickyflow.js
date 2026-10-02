import { colorAtRamp } from '../charts/field/colorRamp';
import { simpleContainerStyle } from '../entities/containers';
import type { RenderNode } from '../scene';
import { DEFAULT_FONT } from '../scene';
import { renderCellHitArea } from './cellHitArea';
import type { PositionedTableColumn, TableRenderContext } from './types';

function renderCellBackground(
  context: TableRenderContext,
  column: PositionedTableColumn,
  rowId: string,
  value: string | boolean,
  y: number,
): RenderNode[] {
  if (!column.scale) {
    return [];
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return [];
  }
  return [
    {
      type: 'rect',
      id: `table-cell-bg-${context.table.id}-${rowId}-${column.id}`,
      order: context.order + 0.09,
      bounds: context.bounds,
      x: column.x,
      y,
      width: column.width,
      height: context.rowHeight,
      style: simpleContainerStyle(colorAtRamp(column.scale, numeric), 'transparent', 0, []),
    },
  ];
}

function cellPropPath(context: TableRenderContext, rowId: string, columnId: string): string | undefined {
  return context.table.propertyPaths?.body[rowId]?.[columnId];
}

export function renderBodyCells(context: TableRenderContext, column: PositionedTableColumn): RenderNode[] {
  return context.table.rows.flatMap((row, rowIndex) => {
    const value = row.cells[column.id];
    const y = context.table.y + context.headerHeight + rowIndex * context.rowHeight;
    const prop = cellPropPath(context, row.id, column.id);
    return [
      ...renderCellBackground(context, column, row.id, value, y),
      ...renderCellHitArea(context, `table-cell-hit-${context.table.id}-${row.id}-${column.id}`, prop, {
        x: column.x,
        y,
        width: column.width,
        height: context.rowHeight,
      }),
      {
        type: 'text' as const,
        id: `table-cell-${context.table.id}-${row.id}-${column.id}`,
        order: context.order + 0.3,
        bounds: context.bounds,
        x: column.x + 6,
        y,
        width: Math.max(0, column.width - 12),
        height: context.rowHeight,
        lines: [String(value ?? '')],
        fontFamily: context.table.fontFamily ?? DEFAULT_FONT,
        fontSize: context.table.fontSize,
        fontWeight: 'normal' as const,
        color: context.table.textColor,
        align: column.align ?? 'left',
        verticalAlign: 'middle' as const,
        lineHeight: 1.2,
        prop,
        propKind: prop ? ('value' as const) : undefined,
      },
    ];
  });
}
