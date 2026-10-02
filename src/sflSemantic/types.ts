import type { Diagnostic } from '../model/diagnostic';
import type { SflLinkOut } from './canvasObjects/artifacts/links/types';
import type { SflCanvasObject } from './canvasObjects/types';
import type { SflGroupOut } from './groups/types';

export type { SflLinkOut } from './canvasObjects/artifacts/links/types';
export {
  isChartObject,
  isIsometricObject,
  isPathObject,
  isSwimlaneObject,
  isTableObject,
  type SflCanvasObject,
  type SflChartObject,
  type SflIsometricObject,
  type SflPathObject,
  type SflSwimlaneObject,
  type SflTableObject,
} from './canvasObjects/types';
export type { SflGroupOut } from './groups/types';

export type SflDiagnostic = Diagnostic;

export interface SflCanvasState {
  canvasObjects: SflCanvasObject[];
  links: SflLinkOut[];
  groups: SflGroupOut[];
  diagnostics: SflDiagnostic[];
}
