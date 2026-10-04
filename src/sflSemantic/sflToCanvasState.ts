import { parse } from '../sflLanguage';
import { resolveCanvasState } from './canvasState/resolver';
import type { SflCanvasState } from './types';

export type {
  SflCanvasObject,
  SflCanvasState,
  SflChartObject,
  SflConnectionOut,
  SflDiagnostic,
  SflGroupOut,
  SflIsometricObject,
  SflLinkOut,
  SflPathObject,
  SflSwimlaneObject,
  SflTableObject,
} from './types';
export {
  isChartObject,
  isIsometricObject,
  isPathObject,
  isSwimlaneObject,
  isTableObject,
} from './types';

export function sflToCanvasState(source: string): SflCanvasState {
  return resolveCanvasState(parse(source));
}
