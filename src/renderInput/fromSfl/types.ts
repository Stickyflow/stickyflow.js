import type { SymbolDef } from '../../model/shape';

export interface PositionedElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number | null;
  symbol?: SymbolDef | null;
}
