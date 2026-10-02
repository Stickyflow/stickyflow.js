export interface SflCanvasObject {
  id: string;
  objectType: 'shape' | 'frame' | 'swimlane' | 'table' | 'path' | 'chart';
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

export type SflChartObject = SflCanvasObject & { chart: NonNullable<SflCanvasObject['chart']> };
export type SflTableObject = SflCanvasObject & { table: NonNullable<SflCanvasObject['table']> };
export type SflSwimlaneObject = SflCanvasObject & { swimlane: NonNullable<SflCanvasObject['swimlane']> };
export type SflPathObject = SflCanvasObject & { path: NonNullable<SflCanvasObject['path']> };

export function isChartObject(canvasObject: SflCanvasObject): canvasObject is SflChartObject {
  return canvasObject.objectType === 'chart' && canvasObject.chart !== undefined;
}

export function isTableObject(canvasObject: SflCanvasObject): canvasObject is SflTableObject {
  return canvasObject.objectType === 'table' && canvasObject.table !== undefined;
}

export function isSwimlaneObject(canvasObject: SflCanvasObject): canvasObject is SflSwimlaneObject {
  return canvasObject.objectType === 'swimlane' && canvasObject.swimlane !== undefined;
}

export function isPathObject(canvasObject: SflCanvasObject): canvasObject is SflPathObject {
  return canvasObject.objectType === 'path' && canvasObject.path !== undefined;
}
