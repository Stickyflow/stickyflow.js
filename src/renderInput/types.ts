import type { Chart } from '../model/chart';
import type { RenderDiagnostic } from '../model/diagnostic';
import type { Frame } from '../model/frame';
import type { Point } from '../model/geometry/types';
import type { Link, PathType } from '../model/link';
import type { FreeformPath } from '../model/path';
import type { Shape } from '../model/shape';
import type { Swimlane } from '../model/swimlane';
import type { Table } from '../model/table';
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
