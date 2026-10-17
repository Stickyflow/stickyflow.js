export interface SankeyNodeInput {
  id: string;
  label: string;
  color?: string;
  offsetX?: number;
  offsetY?: number;
}

export interface SankeyLinkInput {
  source: string;
  target: string;
  value: number;
  color?: string;
}

export interface SankeyLayoutNode {
  id: string;
  label: string;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  column: number;
}

export interface SankeyLayoutLink {
  source: string;
  target: string;
  value: number;
  color?: string;
  x0: number;
  x1: number;
  sourceY0: number;
  sourceY1: number;
  targetY0: number;
  targetY1: number;
}

export interface SankeyLayout {
  nodes: SankeyLayoutNode[];
  links: SankeyLayoutLink[];
}

export interface SankeyGraph {
  ids: Set<string>;
  links: SankeyLinkInput[];
  incoming: Map<string, SankeyLinkInput[]>;
  outgoing: Map<string, SankeyLinkInput[]>;
}

export interface SankeyNodeOffset {
  x: number;
  y: number;
}

export interface SankeyNodeGeometry {
  columns: Map<string, number>;
  y: Map<string, number>;
  heights: Map<string, number>;
  valueScale: number;
  columnCount: number;
}

export interface SankeyLayoutOptions {
  nodeWidth: number;
  nodeGap: number;
}
