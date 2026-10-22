import { parse } from '../sflLanguage';
import { resolveCanvasState } from './canvasState/resolver';
import type { SflCanvasState } from './types';

export type {
  SflCanvasObject,
  SflCanvasState,
  SflChartObject,
  SflComponentObject,
  SflConnectionOut,
  SflDiagnostic,
  SflDimensionObject,
  SflGroupOut,
  SflIsometricObject,
  SflLinkOut,
  SflPathObject,
  SflSwimlaneObject,
} from './types';
export {
  isChartObject,
  isDimensionObject,
  isIsometricObject,
  isPathObject,
  isSwimlaneObject,
} from './types';

export function sflToCanvasState(source: string): SflCanvasState {
  return resolveCanvasState(parse(source));
}
