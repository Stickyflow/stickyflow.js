export interface ChartZone {
  label: string;
  color?: string;
  // Sankey only - a manual nudge from the node's auto-computed position,
  // applied on top of the column/stacking layout rather than replacing it
  // (same relationship a pie label's own offsetX/offsetY has to its
  // computed anchor point).
  offsetX?: number;
  offsetY?: number;
}

export interface ChartRule {
  id: string;
  at: number;
  text?: string;
  color?: string;
  strokeWidth?: number;
  dash?: number[];
}
