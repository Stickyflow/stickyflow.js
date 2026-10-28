import type { Bounds } from '../../scene';

// The room that a chart gives to its plot, its labels and its legend.
export interface ChartLayout {
  bounds: Bounds;
  plot: { x: number; y: number; width: number; height: number };
  showLabels: boolean;
  showLegend: boolean;
  padLeft: number;
}
