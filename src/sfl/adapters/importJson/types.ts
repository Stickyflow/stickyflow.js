import type { SflDiagnostic } from '../../sflToCanvasState';
import type { chartObject } from './chart';
import type { frameObject } from './frame';
import type { linkObject } from './link';
import type { pathObject } from './path';
import type { shapeObject } from './shape';
import type { swimlaneObject } from './swimlane';
import type { tableObject } from './table';

export type ImportChart = ReturnType<typeof chartObject>;
export type ImportFrame = ReturnType<typeof frameObject>;
export type ImportLink = ReturnType<typeof linkObject>;
export type ImportPath = ReturnType<typeof pathObject>;
export type ImportShape = ReturnType<typeof shapeObject>;
export type ImportSwimlane = ReturnType<typeof swimlaneObject>;
export type ImportTable = ReturnType<typeof tableObject>;

export interface ImportBuckets {
  notes: never[];
  shapes: ImportShape[];
  links: ImportLink[];
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

export interface SflImportGroupEntities {
  notes: never[];
  shapes: object[];
  links: object[];
}

export interface SflImportCanvasEntities extends SflImportGroupEntities {
  frames: object[];
  swimlanes: object[];
  tables: object[];
  paths: object[];
  charts: object[];
}

export interface SflImportGroup {
  id: string;
  name: string;
  color: string | undefined;
  icon: string | undefined;
  parent_group_id: string | undefined;
  parent_frame_id: string | undefined;
  entities: SflImportGroupEntities;
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
    groups: SflImportGroup[];
  };
  diagnostics: SflDiagnostic[];
}
