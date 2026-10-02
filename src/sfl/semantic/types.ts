import type { Diagnostic } from '../../model/diagnostic';
import type { SflLinkOut } from './canvasObjects/artifacts/links/types';
import type { SflEntityOut } from './canvasObjects/types';
import type { SflGroupOut } from './groups/types';

export type { SflLinkOut } from './canvasObjects/artifacts/links/types';
export {
  isChartEntity,
  isPathEntity,
  isSwimlaneEntity,
  isTableEntity,
  type SflChartEntity,
  type SflEntityOut,
  type SflPathEntity,
  type SflSwimlaneEntity,
  type SflTableEntity,
} from './canvasObjects/types';
export type { SflGroupOut } from './groups/types';

export type SflDiagnostic = Diagnostic;

export interface SflCanvasState {
  entities: SflEntityOut[];
  links: SflLinkOut[];
  groups: SflGroupOut[];
  diagnostics: SflDiagnostic[];
}
