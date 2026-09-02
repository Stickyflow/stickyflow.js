import { axisBands, mapChartValue } from '../../primitives';
import type { ChartRenderContext } from '../types';
import type { MatrixGeometry, MatrixZoneBounds } from './types';

export function createMatrixGeometry(context: ChartRenderContext): MatrixGeometry {
  const { chart, plot } = context;
  const xBands = axisBands(chart.axis_x);
  const yBands = axisBands(chart.axis_y);
  return {
    xBands,
    yBands,
    xBandCount: xBands.length - 1,
    yBandCount: yBands.length - 1,
    xPixel: value => plot.x + mapChartValue(value, chart.axis_x, plot.width),
    yPixel: value => plot.y + plot.height - mapChartValue(value, chart.axis_y, plot.height),
  };
}

export function matrixZoneBounds(geometry: MatrixGeometry, xBandIndex: number, yBandIndex: number): MatrixZoneBounds {
  const x1 = geometry.xPixel(geometry.xBands[xBandIndex]);
  const x2 = geometry.xPixel(geometry.xBands[xBandIndex + 1]);
  const y1 = geometry.yPixel(geometry.yBands[yBandIndex + 1]);
  const y2 = geometry.yPixel(geometry.yBands[yBandIndex]);
  return {
    x: x1,
    y: y1,
    width: Math.max(0, x2 - x1),
    height: Math.max(0, y2 - y1),
  };
}
