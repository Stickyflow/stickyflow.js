// biome-ignore-all assist/source/organizeImports: Public exports follow the documented L0-L5 architecture.
export type { Chart, ChartAxis, ChartRamp, ChartSeries, ChartType } from './model/chart';
export { CHART_TYPES } from './model/chart';
export { AXIS_COS, AXIS_SIN } from './model/isometricObject';
export type { IsometricFace, IsometricObject } from './model/isometricObject';
export type { Dimension } from './model/dimension';
export type { FreeformPath, PathFrame, PathPoint, PathSymbol } from './model/path';
export { flattenPath, pathBounds, pathToSymbol, symbolToPath } from './model/path';
export type { ShapeType } from './model/shape';
export { SHAPE_TYPES } from './model/shape';
export type { Shader, ShaderParameter } from './model/shader';
export type {
  RollingNumberComponent,
  RollingNumberComponentStyle,
  RulerComponent,
  TickScaleComponent,
  Component,
  ComponentDescriptor,
  ComponentGroup,
  ComponentInteraction,
  ComponentPropertyDescriptor,
  ComponentSize,
  ComponentType,
  ComponentValue,
  ComponentValueDescriptor,
  ComponentValueType,
  GenericComponent,
} from './model/component';
export { getComponentDescriptor, isGenericComponent } from './model/component';
export type {
  RollingNumberWidget,
  RollingNumberWidgetStyle,
  RulerWidget,
  TickScaleWidget,
  Widget,
  WidgetType,
} from './model/component/legacyNames';

export { canonicalize, parse } from './sflLanguage';

export type {
  SflCanvasObject,
  SflCanvasState,
  SflChartObject,
  SflDimensionObject,
  SflGroupOut,
  SflIsometricObject,
  SflLinkOut,
  SflPathObject,
  SflSwimlaneObject,
} from './sflSemantic/sflToCanvasState';
export {
  isChartObject,
  isDimensionObject,
  isIsometricObject,
  isPathObject,
  isSwimlaneObject,
  sflToCanvasState,
} from './sflSemantic/sflToCanvasState';

export { sflToRenderInput } from './renderInput/fromSfl';
export { decodeColor, decodeShadow } from './renderInput/styleDecoding';
export type { RenderInput } from './renderInput/types';

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

export { DOM_CONTRACT_VERSION } from './svg/domContract/version';

export type { ComponentDefinition, ComponentSceneContext, RenderOptions, RenderResult } from './render';
export { defineComponent, render, renderCanvas } from './render';

export type { SflImportJson } from './adapters/importJson';
export { sflToImportJson } from './adapters/importJson';

export type {
  BindingDiagnostic,
  BindingGraph,
  BindingRuntime,
  BindingRuntimeOptions,
  RenderBoundOptions,
  BindingTarget,
  BindingType,
  BindingValue,
  BoundAssignment,
  BoundHandler,
  BoundProperty,
  DataSource,
  DataSourceContract,
  ElementInfo,
  ElementState,
  InteractiveElements,
  MutableDataSource,
} from './binding';
export { buildBindingGraph, createBindingRuntime, createDataSource, interactiveElements, renderBound } from './binding';
