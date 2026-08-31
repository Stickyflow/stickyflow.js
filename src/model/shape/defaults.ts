import type { ShapeType } from './types'

// Common defaults for all shapes
const COMMON_DEFAULTS = {
  // Legacy Support
  strokeColor: '#cbd5e1', // Neutral gray (slate-300)
  strokeWidth: 2,
  fillColor: '#ffffff', // White
  dash: [],
  strokeStyle: 'solid' as const,
  // Text formatting
  fontSize: 14,
  fontWeight: 'normal' as const,
  textAlign: 'center' as const,
  textVerticalAlign: 'middle' as const,
  lineHeight: 1.3,
  // Visual effects
  hasShadow: false,
  // Neues Styling-System
  shapeStyle: {
    stroke: {
      type: 'solid' as const,
      color: '#cbd5e1', // Neutral gray
      width: 2,
      opacity: 1,
      dash: []
    },
    fill: {
      type: 'solid' as const,
      color: '#ffffff', // White
      opacity: 1
    },
    opacity: 1
  }
};

// Shape-spezifische Defaults
export const SHAPE_DEFAULTS = {
  rectangle: {
    ...COMMON_DEFAULTS
  },
  rounded_rectangle: {
    ...COMMON_DEFAULTS,
    cornerRadius: 8,
  },
  circle: COMMON_DEFAULTS,
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
  container_rectangle: COMMON_DEFAULTS,
  pill: COMMON_DEFAULTS,
  person: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  // Freie Form (§5.5): die Geometrie kommt aus Shape.symbol, hier stehen nur
  // die gemeinsamen Darstellungs-Defaults - eine Symbol-Shape entsteht
  // ausschließlich über SFL, nie interaktiv.
  symbol: {
    ...COMMON_DEFAULTS,
    rotation: 0,
  },
  // Maps §3.3: base-layer image. No stroke by default - an uploaded photo/
  // floor-plan scan doesn't want a border unless the author adds one.
  image: {
    ...COMMON_DEFAULTS,
    rotation: 0,
    imageFit: 'cover' as const,
  },
} as const;

/** Every valid `shape:` value, as a real runtime array — `ShapeType` itself
 *  is erased at compile time, so a host building something like a shape
 *  picker had no way to iterate it and previously had to hand-copy the list
 *  (see examples/sfl-chat before this export existed), which drifts the
 *  moment a shape is added or removed here. Derived from SHAPE_DEFAULTS'
 *  own keys rather than declared separately, so the two can't disagree. */
export const SHAPE_TYPES = Object.keys(SHAPE_DEFAULTS) as ShapeType[];

