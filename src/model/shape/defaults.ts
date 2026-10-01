import type { ShapeType } from './types';

const COMMON_DEFAULTS = {
  strokeColor: '#cbd5e1',
  strokeWidth: 2,
  fillColor: '#ffffff',
  dash: [],
  strokeStyle: 'solid' as const,
  fontSize: 14,
  fontWeight: 'normal' as const,
  textAlign: 'center' as const,
  textVerticalAlign: 'middle' as const,
  lineHeight: 1.3,
  hasShadow: false,
  shapeStyle: {
    stroke: {
      type: 'solid' as const,
      color: '#cbd5e1',
      width: 2,
      opacity: 1,
      dash: [],
    },
    fill: {
      type: 'solid' as const,
      color: '#ffffff',
      opacity: 1,
    },
    opacity: 1,
  },
};

export const SHAPE_DEFAULTS = {
  rectangle: {
    ...COMMON_DEFAULTS,
  },
  rounded_rectangle: {
    ...COMMON_DEFAULTS,
    cornerRadius: 8,
  },
  triangle: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  diamond: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  hexagon: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  oval: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  document: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  parallelogram: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  trapezoid: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  cylinder: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  note: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  cloud: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  predefined_process: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  pill: COMMON_DEFAULTS,
  person: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  symbol: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
} as const;

export const SHAPE_TYPES = Object.keys(SHAPE_DEFAULTS) as ShapeType[];
