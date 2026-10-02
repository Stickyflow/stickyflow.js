import { parse } from '../sfl/parser';
import { resolveCanvasState } from './canvasState/resolver';
import type { SflCanvasState } from './types';

export type {
  SflCanvasState,
  SflChartEntity,
  SflDiagnostic,
  SflEntityOut,
  SflGroupOut,
  SflLinkOut,
  SflPathEntity,
  SflSwimlaneEntity,
  SflTableEntity,
} from './types';
export {
  isChartEntity,
  isPathEntity,
  isSwimlaneEntity,
  isTableEntity,
} from './types';

export function sflToCanvasState(source: string): SflCanvasState {
  return resolveCanvasState(parse(source));
}
