import type { Shape } from './types';

type MutableShapeFields =
  | 'name'
  | 'shapeType'
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'rotation'
  | 'text'
  | 'textColor'
  | 'fontSize'
  | 'fontWeight'
  | 'fontFamily'
  | 'textAlign'
  | 'textVerticalAlign'
  | 'lineHeight'
  | 'strokeColor'
  | 'strokeWidth'
  | 'fillColor'
  | 'cornerRadius'
  | 'dash'
  | 'strokeStyle'
  | 'hasShadow'
  | 'shadowStyle'
  | 'shapeStyle'
  | 'subShapes';

type ShapeChanges = Partial<Pick<Shape, MutableShapeFields>>;

export type ShapeUpdate = ShapeChanges;

export type ShapeCreate = Pick<Shape, 'x' | 'y' | 'width' | 'height'> &
  ShapeChanges &
  Partial<
    Pick<
      Shape,
      'parent_frame_id' | 'parent_swimlane_id' | 'lane_id' | 'layer_group' | 'order_key' | 'is_visible' | 'is_locked'
    >
  >;
