import type { ShapeType } from './types';

export const SHAPE_TYPES = [
  'rectangle',
  'rounded_rectangle',
  'triangle',
  'diamond',
  'hexagon',
  'oval',
  'document',
  'parallelogram',
  'trapezoid',
  'cylinder',
  'note',
  'cloud',
  'predefined_process',
  'pill',
  'person',
  'symbol',
] as const satisfies readonly ShapeType[];
