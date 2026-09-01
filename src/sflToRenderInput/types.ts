import type { Chart } from '../model/charts';
import type { Frame } from '../model/frames';
import type { Link } from '../model/links';
import type { FreeformPath } from '../model/paths';
import type { Shape, SymbolDef } from '../model/shapes';
import type { Swimlane } from '../model/swimlanes';
import type { Table } from '../model/tables';
import type { RenderDiagnostic } from '../rendering/renderScene';

interface ImportEntityBuckets {
  shapes?: unknown[];
  links?: unknown[];
  frames?: unknown[];
  swimlanes?: unknown[];
  tables?: unknown[];
  paths?: unknown[];
  charts?: unknown[];
}

export interface ImportRenderJson {
  canvas?: { entities?: ImportEntityBuckets };
  layers?: { groups?: Array<{ entities?: Pick<ImportEntityBuckets, 'shapes' | 'links'> }> };
  diagnostics?: RenderDiagnostic[];
}

export interface RenderEntities {
  shapes: Shape[];
  links: Link[];
  frames: Frame[];
  swimlanes: Swimlane[];
  tables: Table[];
  paths: FreeformPath[];
  charts: Chart[];
}

export interface PositionedElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number | null;
  symbol?: SymbolDef | null;
}
