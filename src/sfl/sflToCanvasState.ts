import { parse } from './parser';
import { resolveCanvasState } from './semantic/canvasState/resolver';
import type { SflCanvasState } from './semantic/types';

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
} from './semantic/types';
export {
  isChartEntity,
  isPathEntity,
  isSwimlaneEntity,
  isTableEntity,
} from './semantic/types';

export function sflToCanvasState(source: string): SflCanvasState {
  return resolveCanvasState(parse(source));
}
