import type { Diagnostic } from '../model/diagnostic';
import type { Shader } from '../model/shader';
import type { SflConnectionOut } from './canvasObjects/artifacts/connections/types';
import type { SflLinkOut } from './canvasObjects/artifacts/links/types';
import type { SflCanvasObject } from './canvasObjects/types';
import type { SflGroupOut } from './groups/types';

export type { SflConnectionOut } from './canvasObjects/artifacts/connections/types';
export type { SflLinkOut } from './canvasObjects/artifacts/links/types';
export {
  isChartObject,
  isIsometricObject,
  isPathObject,
  isSwimlaneObject,
  type SflCanvasObject,
  type SflChartObject,
  type SflIsometricObject,
  type SflPathObject,
  type SflSwimlaneObject,
} from './canvasObjects/types';
export type { SflGroupOut } from './groups/types';

export type SflDiagnostic = Diagnostic;

export interface SflCanvasState {
  canvasObjects: SflCanvasObject[];
  links: SflLinkOut[];
  connections: SflConnectionOut[];
  groups: SflGroupOut[];
  diagnostics: SflDiagnostic[];
  shaders?: Shader[];
}
