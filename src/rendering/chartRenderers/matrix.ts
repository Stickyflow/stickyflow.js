import {
  axisBands,
  CHART_COLORS,
  chartText,
  contrastTextColor,
  DEFAULT_ZONE_FILL,
  mapChartValue,
} from '../chartPrimitives';
import { paint } from '../renderPrimitives';
import type { RenderNode, SceneStyle } from '../renderScene';
import type { ChartRenderContext } from './types';

export function renderMatrix(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, showLabels, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const xBands = axisBands(chart.axis_x),
    yBands = axisBands(chart.axis_y);
  const xBandCount = xBands.length - 1,
    yBandCount = yBands.length - 1;
  const zones = chart.config?.zones ?? [];
  const xPixel = (value: number) => plot.x + mapChartValue(value, chart.axis_x, plot.width);
  const yPixel = (value: number) => plot.y + plot.height - mapChartValue(value, chart.axis_y, plot.height);
  if (zones.length)
    for (let yi = 0; yi < yBandCount; yi++)
      for (let xi = 0; xi < xBandCount; xi++) {
        const zone = zones[yi * xBandCount + xi];
        if (!zone) continue;
        const x1 = xPixel(xBands[xi]),
          x2 = xPixel(xBands[xi + 1]),
          y1 = yPixel(yBands[yi + 1]),
          y2 = yPixel(yBands[yi]);
        nodes.push({
          type: 'rect',
          id: `chart-matrix-zone-${chart.id}-${xi}-${yi}`,
          order: nextOrder(),
          bounds,
          x: x1,
          y: y1,
          width: Math.max(0, x2 - x1),
          height: Math.max(0, y2 - y1),
          style: { fill: { kind: 'solid', color: zone.color ?? DEFAULT_ZONE_FILL } },
        });
        if (zone.label)
          nodes.push({
            ...chartText(
              `chart-matrix-zone-label-${chart.id}-${xi}-${yi}`,
              nextOrder(),
              bounds,
              x1 + 6,
              y1 + 4,
              Math.max(0, x2 - x1) - 12,
              16,
              zone.label,
              chart,
            ),
            color: contrastTextColor(zone.color),
          });
      }
  const gridStyle: SceneStyle = { fill: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' } };
  for (let xi = 1; xi < xBandCount; xi++) {
    const x = xPixel(xBands[xi]);
    nodes.push({
      type: 'rect',
      id: `chart-matrix-divider-x-${chart.id}-${xi}`,
      order: nextOrder(),
      bounds,
      x: x - 0.5,
      y: plot.y,
      width: 1,
      height: plot.height,
      style: gridStyle,
    });
  }
  for (let yi = 1; yi < yBandCount; yi++) {
    const y = yPixel(yBands[yi]);
    nodes.push({
      type: 'rect',
      id: `chart-matrix-divider-y-${chart.id}-${yi}`,
      order: nextOrder(),
      bounds,
      x: plot.x,
      y: y - 0.5,
      width: plot.width,
      height: 1,
      style: gridStyle,
    });
  }
  chart.series.forEach((series, seriesIndex) => {
    const explicit = series.values.length > 0 && Array.isArray(series.values[0]);
    const [vx, vy] = explicit
      ? (series.values as [number, number][])[0]
      : [chart.axis_x.min, (series.values as number[])[0] ?? chart.axis_y.min];
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length];
    const r = Math.max(1, series.size ?? 5);
    const x = xPixel(vx),
      y = yPixel(vy);
    nodes.push({
      type: 'ellipse',
      id: `chart-matrix-point-${chart.id}-${series.id}`,
      order: nextOrder(),
      bounds,
      cx: x,
      cy: y,
      rx: r,
      ry: r,
      style: { fill: paint(color, diagnostics, chart.id) },
    });
    if (showLabels && series.label)
      nodes.push(
        chartText(
          `chart-matrix-label-${chart.id}-${series.id}`,
          nextOrder(),
          bounds,
          x + r + 4,
          y - 7,
          120,
          14,
          series.label,
          chart,
        ),
      );
  });
  return nodes;
}
