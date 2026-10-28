// The canvas objects that have a part of their own, and the guards that tell them. They are kept apart from the base type, which they build on.
export type { SflChartObject } from './artifacts/chart/object';
export { isChartObject } from './artifacts/chart/object';
export type { SflDimensionObject } from './artifacts/dimension/object';
export { isDimensionObject } from './artifacts/dimension/object';
export type { SflIsometricObject } from './artifacts/isometric/object';
export { isIsometricObject } from './artifacts/isometric/object';
export type { SflPathObject } from './artifacts/path/object';
export { isPathObject } from './artifacts/path/object';
export type { SflSwimlaneObject } from './artifacts/swimlane/object';
export { isSwimlaneObject } from './artifacts/swimlane/object';
