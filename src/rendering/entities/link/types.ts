import type { PathSegment } from '../../../model/geometry/routing';
import type { Link, PathType } from '../../../model/link';
import type { Bounds, Point, SceneStyle } from '../../scene';

export interface LinkLabelLayout {
  visible: boolean;
  fontSize: number;
  width: number;
  height: number;
  lines: string[];
}

export interface LinkRenderContext {
  link: Link;
  pathType: PathType;
  points: number[];
  segments: PathSegment[];
  midpoint: Point;
  strokeWidth: number;
  bounds: Bounds;
  color: string;
  order: number;
  style: SceneStyle;
  label: LinkLabelLayout;
  hasLabelGap: boolean;
}
