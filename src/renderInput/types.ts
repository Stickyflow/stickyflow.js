import type { Chart } from '../model/chart';
import type { Diagnostic } from '../model/diagnostic';
import type { Frame } from '../model/frame';
import type { Point } from '../model/geometry/types';
import type { IsometricObject } from '../model/isometricObject';
import type { Link } from '../model/link';
import type { FreeformPath } from '../model/path';
import type { Shape } from '../model/shape';
import type { Swimlane } from '../model/swimlane';

export interface RenderInputLink {
  link: Link;
  from: Point;
  to: Point;
  kind?: string;
}

export interface RenderInput {
  shapes: Shape[];
  frames: Frame[];
  swimlanes: Swimlane[];
  isometricObjects?: IsometricObject[];
  paths?: FreeformPath[];
  charts?: Chart[];
  links: RenderInputLink[];
  diagnostics?: Diagnostic[];
}
