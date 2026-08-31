import type { Side } from '../ast';

export interface SflEntityOut {
  id: string;
  entityType: 'shape' | 'frame' | 'swimlane' | 'table' | 'path' | 'chart';
  kind: string;
  text?: string;
  shapeType?: string;
  // Freie benannte Form (§5.5) - nur gesetzt, wenn `shape:` auf einen
  // Symbol-Block zeigt (shapeType wird dabei auf 'symbol' gesetzt).
  symbol?: { name: string; points: Array<[number, number]>; tension?: number; ports?: Array<{ name: string; at: [number, number] }> };
  x: number; y: number; width: number; height: number;
  rotation?: number;
  order?: number;
  parentFrameId?: string;
  // präsentationale Props als Strings (verbatim aus dem SFL / gemergten Style)
  props: Record<string, string>;
  table?: {
    columns: Array<{
      id: string; label: string; width: number; type: 'text' | 'boolean' | 'number';
      // SFL 1.4, §3.6.
      align?: 'left' | 'center' | 'right';
      // Raw "ramp(...)" string, decoded to a structured ramp at the SFL
      // adapter boundary (sflToImportJson's tableObject) - same split as
      // Chart's own `scale` above.
      scale?: string;
    }>;
    rows: Array<{ id: string; cells: Record<string, string | boolean> }>;
    // §3.6 Footer: at most one summary row, same cell shape as a Row.
    footer?: { id: string; cells: Record<string, string | boolean> };
  };
  swimlane?: {
    orientation: 'horizontal' | 'vertical';
    lanes: Array<{ id: string; label: string; size: number; color?: string }>;
  };
  path?: {
    points: Array<{ x: number; y: number }>;
    tension?: number; startMarker?: string; endMarker?: string; closed?: boolean;
    // Maps §3.3
    value?: number;
  };
  chart?: {
    chartType: 'bar' | 'line' | 'scatter' | 'radar' | 'radial' | 'field' | 'heatmap' | 'boxplot' | 'sankey' | 'treemap' | 'mekko' | 'hexbin' | 'pie' | 'matrix' | 'grid' | 'custom';
    categories?: string[];
    areaOpacity?: number;
    // SFL 1.4, §5.4.1: bar-only, 'none'/absent both mean today's grouped
    // behavior - normalized to undefined so downstream consumers only ever
    // see the three values that actually change computation.
    stacked?: 'true' | 'percent' | 'waterfall';
    // Fields §3.4: `scale` is a raw "ramp(...)" string (parsed at the app
    // edge, like fill/stroke's gradient()/mesh()) - `interpolate`/`idwPower`/
    // `isolines` are structural, same footing as `stacked` above.
    scale?: string;
    interpolate?: 'idw';
    idwPower?: number;
    isolines?: number[];
    // Heatmap only: ordered low->high color bands for axisY.thresholds (one
    // more zone than thresholds).
    zones?: Array<{ label: string; color?: string }>;
    // Boxplot only.
    boxWidth?: number; barCornerRadius?: number; showBoxplotPoints?: boolean;
    barBorderColor?: string; barBorderWidth?: number;
    // Mekko only.
    mekkoVaryHeight?: boolean;
    // Hexbin only: pixel radius of each hexagon cell.
    hexRadius?: number;
    // Pie only: >0 turns the disc into a donut of this pixel radius.
    innerRadius?: number;
    axisX: { min: number; max: number; step: number; label?: string; unit?: string; thresholds?: number[] };
    axisY: { min: number; max: number; step: number; label?: string; unit?: string; thresholds?: number[] };
    series: Array<{ id: string; label: string; color?: string; opacity?: number; values: number[] | [number, number][] | [number, number, number][] | [number, number, number, number][]; error?: Array<number | [number, number] | null>; source?: string; target?: string; size?: number; symbol?: { points: Array<[number, number]> }; stroke?: string; strokeWidth?: number }>;
    // SFL 1.4, §5.4.8
    rules: Array<{ id: string; at: number; text?: string; color?: string; strokeWidth?: number; dash?: number[] }>;
  };
}

export interface SflLinkOut {
  id: string;
  fromId?: string;
  toId?: string;
  text?: string;
  fromSide?: Side; fromFraction?: number;
  toSide?: Side; toFraction?: number;
  // §3.5 Named Ports: set when the endpoint was `entity.portName` and
  // `portName` resolved against the entity's symbol.ports (mutually
  // exclusive with fromSide/toSide above).
  fromPort?: string; toPort?: string;
  order?: number;
  /** Per-segment perpendicular offsets for a manually-adjusted orthogonal
   *  route — absent means "use the router's default bend". */
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

/**
 * Mirrors `RenderDiagnostic` (src/rendering/renderScene.ts) structurally
 * rather than importing it — `sfl/` has no dependency on `rendering/`, and the
 * two shapes only ever need to line up, never share an identity. Anything
 * pushed here flows straight through sflToImportJson → sflToRenderInput →
 * buildRenderScene's own diagnostics array (seeded from this one) without
 * conversion.
 */
export interface SflDiagnostic {
  severity: 'warning' | 'error';
  code: string;
  message: string;
  entityId?: string;
}

export interface SflCanvasState {
  entities: SflEntityOut[];
  links: SflLinkOut[];
  groups: SflGroupOut[];
  diagnostics: SflDiagnostic[];
}
