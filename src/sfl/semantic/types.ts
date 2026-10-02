import type { Diagnostic } from '../../model/diagnostic';
import type { Side } from '../ast';

export interface SflEntityOut {
  id: string;
  entityType: 'shape' | 'frame' | 'swimlane' | 'table' | 'path' | 'chart';
  kind: string;
  text?: string;
  shapeType?: string;
  symbol?: {
    name: string;
    points: Array<[number, number]>;
    tension?: number;
    ports?: Array<{ name: string; at: [number, number] }>;
  };
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  order?: number;
  parentFrameId?: string;
  props: Record<string, string>;
  table?: {
    columns: Array<{
      id: string;
      label: string;
      width: number;
      type: 'text' | 'boolean' | 'number';
      align?: 'left' | 'center' | 'right';
      scale?: string;
    }>;
    rows: Array<{ id: string; cells: Record<string, string | boolean> }>;
    footer?: { id: string; cells: Record<string, string | boolean> };
    columnsBlockName?: string;
    rowsBlockName?: string;
    footerBlockName?: string;
  };
  swimlane?: {
    orientation: 'horizontal' | 'vertical';
    lanes: Array<{ id: string; label: string; size: number; color?: string }>;
  };
  path?: {
    points: Array<{ x: number; y: number }>;
    tension?: number;
    startMarker?: string;
    endMarker?: string;
    closed?: boolean;
    value?: number;
  };
  chart?: {
    chartType:
      | 'bar'
      | 'line'
      | 'scatter'
      | 'radar'
      | 'radial'
      | 'field'
      | 'heatmap'
      | 'boxplot'
      | 'sankey'
      | 'treemap'
      | 'mekko'
      | 'hexbin'
      | 'pie'
      | 'radialBar'
      | 'polarArea'
      | 'custom';
    categories?: string[];
    areaOpacity?: number;
    stacked?: 'true' | 'percent' | 'waterfall';
    scale?: string;
    interpolate?: 'idw';
    idwPower?: number;
    isolines?: number[];
    zones?: Array<{ label: string; color?: string }>;
    boxWidth?: number;
    orientation?: 'horizontal' | 'vertical';
    lineTension?: number;
    barCornerRadius?: number;
    showBoxplotPoints?: boolean;
    barBorderColor?: string;
    barBorderWidth?: number;
    mekkoVaryHeight?: boolean;
    hexRadius?: number;
    innerRadius?: number;
    pieCornerRadius?: number;
    pieSliceGap?: number;
    ringThickness?: number;
    ringGap?: number;
    cellGap?: number;
    showValues?: boolean;
    squareCells?: boolean;
    headerColor?: string;
    tileGradient?: boolean;
    showColumnBackdrop?: boolean;
    labelPosition?: 'outside' | 'inside';
    labelOrientation?: 'horizontal' | 'vertical';
    labelColor?: string;
    linkGradient?: boolean;
    connectPoints?: boolean;
    reverseComparison?: boolean;
    axisX: { min: number; max: number; step: number; label?: string; unit?: string; thresholds?: number[] };
    axisY: { min: number; max: number; step: number; label?: string; unit?: string; thresholds?: number[] };
    series: Array<{
      id: string;
      label: string;
      color?: string;
      colors?: Array<string | null>;
      opacity?: number;
      group?: string;
      values: number[] | [number, number][] | [number, number, number][] | [number, number, number, number][];
      error?: Array<number | [number, number] | null>;
      source?: string;
      target?: string;
      size?: number;
      symbol?: { points: Array<[number, number]>; normalized?: boolean; tension?: number };
      stroke?: string;
      strokeWidth?: number;
      labelOffsetX?: number;
      labelOffsetY?: number;
    }>;
    rules: Array<{ id: string; at: number; text?: string; color?: string; strokeWidth?: number; dash?: number[] }>;
  };
}

export type SflChartEntity = SflEntityOut & { chart: NonNullable<SflEntityOut['chart']> };
export type SflTableEntity = SflEntityOut & { table: NonNullable<SflEntityOut['table']> };
export type SflSwimlaneEntity = SflEntityOut & { swimlane: NonNullable<SflEntityOut['swimlane']> };
export type SflPathEntity = SflEntityOut & { path: NonNullable<SflEntityOut['path']> };

export function isChartEntity(canvasObject: SflEntityOut): canvasObject is SflChartEntity {
  return canvasObject.entityType === 'chart' && canvasObject.chart !== undefined;
}

export function isTableEntity(canvasObject: SflEntityOut): canvasObject is SflTableEntity {
  return canvasObject.entityType === 'table' && canvasObject.table !== undefined;
}

export function isSwimlaneEntity(canvasObject: SflEntityOut): canvasObject is SflSwimlaneEntity {
  return canvasObject.entityType === 'swimlane' && canvasObject.swimlane !== undefined;
}

export function isPathEntity(canvasObject: SflEntityOut): canvasObject is SflPathEntity {
  return canvasObject.entityType === 'path' && canvasObject.path !== undefined;
}

export interface SflLinkOut {
  id: string;
  fromId?: string;
  toId?: string;
  text?: string;
  fromSide?: Side;
  fromFraction?: number;
  toSide?: Side;
  toFraction?: number;
  fromPort?: string;
  toPort?: string;
  order?: number;
  segments?: number[];
  props: Record<string, string>;
}

export interface SflGroupOut {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  entityIds: string[];
  subGroups: SflGroupOut[];
  parentFrameId?: string;
}

export type SflDiagnostic = Diagnostic;

export interface SflCanvasState {
  entities: SflEntityOut[];
  links: SflLinkOut[];
  groups: SflGroupOut[];
  diagnostics: SflDiagnostic[];
}
