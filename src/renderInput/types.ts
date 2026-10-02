import type { Chart } from '../model/chart';
import type { Diagnostic } from '../model/diagnostic';
import type { Frame } from '../model/frame';
import type { Point } from '../model/geometry/types';
import type { Link } from '../model/link';
import type { FreeformPath } from '../model/path';
import type { Shape } from '../model/shape';
import type { Swimlane } from '../model/swimlane';
import type { Table } from '../model/table';
import type { IsometricObject } from '../model/isometricObject';

export interface RenderInputLink {
  link: Link;
  from: Point;
  to: Point;
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