import type { Chart } from '../model/chart';
import type { Diagnostic } from '../model/diagnostic';
import type { Frame } from '../model/frame';
import type { Point } from '../model/geometry/types';
import type { IsometricObject } from '../model/isometricObject';
import type { Link } from '../model/link';
import type { FreeformPath } from '../model/path';
import type { Shape } from '../model/shape';
import type { Swimlane } from '../model/swimlane';
import type { Table } from '../model/table';

export interface RenderInputLink {
  link: Link;
  from: Point;
  to: Point;
  // Set for a Connection rendered through the link pipeline (see
  // renderInput/fromSfl/links.ts) - lets buildLink tag the resulting
  // RenderNodes with data-sf-kind="connection" without a parallel renderer.
  kind?: string;
}

export interface TablePropertyPaths {
  header: Record<string, string>;
  body: Record<string, Record<string, string>>;
  footer: Record<string, string>;
}

export interface RenderInputTable extends Table {
  propertyPaths?: TablePropertyPaths;
}

export interface RenderInput {
  shapes: Shape[];
  frames: Frame[];
  swimlanes: Swimlane[];
  isometricObjects?: IsometricObject[];
  tables?: RenderInputTable[];
  paths?: FreeformPath[];
  charts?: Chart[];
  links: RenderInputLink[];
  diagnostics?: Diagnostic[];
}
