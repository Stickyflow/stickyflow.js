import type { SankeyLayoutLink, SankeyLayoutNode } from '../../../model/geometry/sankey';

export interface SankeyRenderData {
  nodes: SankeyLayoutNode[];
  links: SankeyLayoutLink[];
  baseX: number;
  baseY: number;
  labelGutter: number;
  fontSize: number;
  columnCount: number;
  nodeColors: Map<string, string>;
}
