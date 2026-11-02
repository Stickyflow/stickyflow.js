import { parse } from '../sflLanguage';
import { expandDocument } from '../sflLanguage/expansion';
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
  SflMeshObject,
  SflMeshSceneObject,
  SflMeshSurfaceObject,
  SflPathObject,
  SflSwimlaneObject,
} from './types';
export {
  isChartObject,
  isDimensionObject,
  isIsometricObject,
  isMeshObject,
  isMeshSceneObject,
  isMeshSurfaceObject,
  isPathObject,
  isSwimlaneObject,
} from './types';

export function sflToCanvasState(source: string): SflCanvasState {
  return resolveCanvasState(expandDocument(parse(source)));
}
