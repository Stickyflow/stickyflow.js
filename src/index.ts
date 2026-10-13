// biome-ignore-all assist/source/organizeImports: Public exports follow the documented L0-L5 architecture.
// L0 — Model
export type { Chart, ChartAxis, ChartRamp, ChartSeries, ChartType } from './model/chart';
export { CHART_TYPES } from './model/chart';
export { AXIS_COS, AXIS_SIN } from './model/isometricObject';
export type { IsometricFace, IsometricObject } from './model/isometricObject';
export type { FreeformPath, PathPoint } from './model/path';
export type { ShapeType } from './model/shape';
export { SHAPE_TYPES } from './model/shape';
export type { Shader, ShaderParameter } from './model/shader';
export type { RollingNumberWidget, RollingNumberWidgetStyle, Widget, WidgetType } from './model/widget';

// L1 — SFL Language
export { canonicalize, parse } from './sflLanguage';

// L2 — SFL Semantic
export type {
  SflCanvasObject,
  SflCanvasState,
  SflChartObject,
  SflGroupOut,
  SflIsometricObject,
  SflLinkOut,
  SflPathObject,
  SflSwimlaneObject,
} from './sflSemantic/sflToCanvasState';
export {
  isChartObject,
  isIsometricObject,
  isPathObject,
  isSwimlaneObject,
  sflToCanvasState,
} from './sflSemantic/sflToCanvasState';

// L3 — RenderInput
export { sflToRenderInput } from './renderInput/fromSfl';
export { decodeColor, decodeShadow } from './renderInput/styleDecoding';
export type { RenderInput } from './renderInput/types';

// L4 — Render Scene
export type {
  Bounds,
  MeasureTextFactory,
  Point,
  RenderDiagnostic,
  RenderNode,
  RenderScene,
  SceneRole,
  TextMetrics,
} from './renderScene/scene';

// L5 — SVG
export { DOM_CONTRACT_VERSION } from './svg/domContract/version';

// Pipeline facade
export type { RenderOptions, RenderResult } from './render';
export { render, renderCanvas } from './render';

// Adapters
export type { SflImportJson } from './adapters/importJson';
export { sflToImportJson } from './adapters/importJson';

// Data binding
export type {
  BindingDiagnostic,
  BindingGraph,
  BindingRuntime,
  BindingRuntimeOptions,
  BindingTarget,
  BindingType,
  BindingValue,
  BoundProperty,
  DataSource,
  DataSourceContract,
  MutableDataSource,
} from './binding';
export { buildBindingGraph, createBindingRuntime, createDataSource } from './binding';
