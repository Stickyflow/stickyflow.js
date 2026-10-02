import type { Shape } from '../../../model/shape';
import type { Bounds, Point, RenderNode, SceneStyle } from '../../scene';

export interface ShapeRenderContext {
  shape: Shape;
  id: string;
  order: number;
  bounds: Bounds;
  rotation: number;
  rotationCenter: Point;
  style: SceneStyle;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ShapeGeometryRenderer = (context: ShapeRenderContext) => RenderNode[];
