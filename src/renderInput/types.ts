import type { Chart } from '../model/charts';
import type { RenderDiagnostic } from '../model/diagnostics';
import type { Frame } from '../model/frames';
import type { Point } from '../model/geometry/types';
import type { Link, PathType } from '../model/links';
import type { FreeformPath } from '../model/paths';
import type { Shape } from '../model/shapes';
import type { Swimlane } from '../model/swimlanes';
import type { Table } from '../model/tables';
export interface ResolvedExportLink {
  link: Link;
  from: Point;
  to: Point;
}

export interface RenderInput {
  shapes: Shape[];
  frames: Frame[];
  swimlanes: Swimlane[];
  tables?: Table[];
  paths?: FreeformPath[];
  charts?: Chart[];
  links: ResolvedExportLink[];
  diagnostics?: RenderDiagnostic[];
}

export interface ResolvedLinkGeometry {
  id: string;
  pathType: PathType;
  points: number[];
  label?: Point;
}
