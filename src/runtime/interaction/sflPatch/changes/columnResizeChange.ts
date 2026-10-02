import { sflToCanvasState } from '../../../../sflSemantic/sflToCanvasState';
import type { ColumnResizeChangeEvent } from '../../events';
import { applyPropertyChange } from './propertyChange';
import { applyResizeChange } from './resizeChange';

export function applyColumnResizeChange(sfl: string, event: ColumnResizeChangeEvent): string {
  const entity = sflToCanvasState(sfl).canvasObjects.find(candidate => candidate.id === event.owner.id);
  const table = entity?.table;
  const column = table?.columns.find(candidate => candidate.id === event.columnId);
  const columnsBlockName = table?.columnsBlockName;
  if (!entity || !table || !column || !columnsBlockName) {
    return sfl;
  }

  const withColumnWidth = applyPropertyChange(sfl, {
    owner: event.owner,
    path: `Columns[${columnsBlockName}].Column[${event.columnId}].width`,
    value: event.width,
  });

  const declaredTotal = table.columns.reduce((sum, candidate) => sum + candidate.width, 0);
  const widthScale = declaredTotal > 0 ? entity.width / declaredTotal : 1;
  const deltaWidth = (event.width - column.width) * widthScale;
  if (deltaWidth === 0) {
    return withColumnWidth;
  }

  return applyResizeChange(withColumnWidth, {
    owner: event.owner,
    x: entity.x,
    y: entity.y,
    width: entity.width + deltaWidth,
    height: entity.height,
    dx: 0,
    dy: 0,
    dWidth: deltaWidth,
    dHeight: 0,
  });
}
