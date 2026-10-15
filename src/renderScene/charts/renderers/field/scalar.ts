import type { RenderNode } from '../../../scene';
import { colorAtRamp } from '../../field/colorRamp';
import { computeFieldGrid, fieldSurfaceClip } from '../../field/grid';
import { computeIsolineSegments, stitchIsolineSegments } from '../../field/isolines';
import type { FieldSample } from '../../field/types';
import { linePathData } from '../../primitives/linePath';
import type { ChartRenderContext } from '../types';
import type { ScalarFieldGrid } from './types';

const ISOLINE_TENSION = 0.5;

export function renderScalarField(context: ChartRenderContext, samples: FieldSample[]): RenderNode[] {
  if (!samples.length || context.plot.width <= 0 || context.plot.height <= 0) {
    return [];
  }

  const grid = createScalarGrid(context, samples);
  return [...renderFieldCells(context, grid), ...renderIsolines(context, grid)];
}

function createScalarGrid(context: ChartRenderContext, samples: FieldSample[]): ScalarFieldGrid {
  const { plot, chart } = context;
  const result = computeFieldGrid(samples, plot.width, plot.height, chart.config?.idwPower ?? 2);
  return {
    values: result.grid,
    columns: result.cols,
    rows: result.rows,
    cellWidth: plot.width / Math.max(1, result.cols - 1),
    cellHeight: plot.height / Math.max(1, result.rows - 1),
  };
}

function renderFieldCells(context: ChartRenderContext, grid: ScalarFieldGrid): RenderNode[] {
  const nodes: RenderNode[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let column = 0; column < grid.columns; column++) {
      nodes.push(createFieldCell(context, grid, row, column));
    }
  }
  return nodes;
}

function createFieldCell(context: ChartRenderContext, grid: ScalarFieldGrid, row: number, column: number): RenderNode {
  const { chart, plot, bounds, nextOrder } = context;
  const centerX = plot.x + plot.width * (column / (grid.columns - 1));
  const centerY = plot.y + plot.height * (row / (grid.rows - 1));
  const color = colorAtRamp(chart.config?.scale, grid.values[row * grid.columns + column]);
  return {
    type: 'rect',
    id: `chart-field-cell-${chart.id}-${row}-${column}`,
    order: nextOrder(),
    bounds,
    x: centerX - grid.cellWidth / 2,
    y: centerY - grid.cellHeight / 2,
    width: grid.cellWidth,
    height: grid.cellHeight,
    style: { fill: { kind: 'solid', color }, clip: fieldSurfaceClip(chart, plot) },
  };
}

function renderIsolines(context: ChartRenderContext, grid: ScalarFieldGrid): RenderNode[] {
  const nodes: RenderNode[] = [];
  (context.chart.config?.isolines ?? []).forEach((threshold, thresholdIndex) => {
    const node = createIsoline(context, grid, threshold, thresholdIndex);
    if (node) {
      nodes.push(node);
    }
  });
  return nodes;
}

function createIsoline(
  context: ChartRenderContext,
  grid: ScalarFieldGrid,
  threshold: number,
  thresholdIndex: number,
): RenderNode | null {
  const { chart, plot, bounds, nextOrder } = context;
  const segments = computeIsolineSegments(
    {
      values: grid.values,
      columns: grid.columns,
      rows: grid.rows,
      width: plot.width,
      height: plot.height,
    },
    threshold,
  );
  if (!segments.length) {
    return null;
  }
  const chains = stitchIsolineSegments(segments);
  const path = chains
    .map(chain =>
      linePathData(
        chain.map(([x, y]) => ({ x: plot.x + x, y: plot.y + y })),
        ISOLINE_TENSION,
      ),
    )
    .join(' ');
  return {
    type: 'path',
    id: `chart-field-isoline-${chart.id}-${thresholdIndex}`,
    order: nextOrder(),
    bounds,
    d: path,
    style: {
      fill: { kind: 'none' },
      stroke: { kind: 'solid', color: 'rgba(15, 23, 42, 0.55)' },
      strokeWidth: 1,
      clip: fieldSurfaceClip(chart, plot),
    },
  };
}
