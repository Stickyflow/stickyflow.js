import { parse } from '../sflLanguage';
import { resolveCanvasState } from './canvasState/resolver';
import type { SflCanvasState } from './types';

export type {
  SflCanvasObject,
  SflCanvasState,
  SflChartObject,
  SflDiagnostic,
  SflGroupOut,
  SflLinkOut,
  SflPathObject,
  SflSwimlaneObject,
  SflTableObject,
} from './types';
export {
  isChartObject,
  isPathObject,
  isSwimlaneObject,
  isTableObject,
} from './types';

export function sflToCanvasState(source: string): SflCanvasState {
  return resolveCanvasState(parse(source));
}
