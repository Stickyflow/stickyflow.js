import type { SflCanvasObject } from '../../types';

export interface SflTableData {
  columns: Array<{
    id: string;
    label: string;
    width: number;
    type: 'text' | 'boolean' | 'number';
    align?: 'left' | 'center' | 'right';
    scale?: string;
  }>;
  rows: Array<{ id: string; cells: Record<string, string | boolean> }>;
  footer?: { id: string; cells: Record<string, string | boolean> };
  columnsBlockName?: string;
  rowsBlockName?: string;
  footerBlockName?: string;
}

export type SflTableObject = SflCanvasObject & {
  objectType: 'table';
  table: SflTableData;
};

export function isTableObject(canvasObject: SflCanvasObject): canvasObject is SflTableObject {
  return canvasObject.objectType === 'table' && canvasObject.table !== undefined;
}
