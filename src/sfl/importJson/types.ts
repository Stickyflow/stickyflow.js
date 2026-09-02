import type { Chart } from '../../model/charts';
import type { Frame } from '../../model/frames';
import type { Link } from '../../model/links';
import type { FreeformPath } from '../../model/paths';
import type { Shape } from '../../model/shapes';
import type { Swimlane } from '../../model/swimlanes';
import type { Table } from '../../model/tables';
import type { SflDiagnostic } from '../sflToCanvasState';

export interface ImportBuckets {
  notes: never[];
  shapes: Shape[];
  links: Link[];
}

export interface ImportGroup {
  id: string;
  name: string;
  color: string | undefined;
  icon: string | undefined;
  parent_group_id: string | undefined;
  parent_frame_id: string | undefined;
  entities: ImportBuckets;
}

export interface SflImportCanvasEntities extends ImportBuckets {
  frames: Frame[];
  swimlanes: Swimlane[];
  tables: Table[];
  paths: FreeformPath[];
  charts: Chart[];
}

export interface SflImportJson {
  project: {
    export_type: 'stickyflow_canvas_v3';
    name: string;
  };
  canvas: {
    entities: SflImportCanvasEntities;
  };
  layers: {
    groups: ImportGroup[];
  };
  diagnostics: SflDiagnostic[];
}
