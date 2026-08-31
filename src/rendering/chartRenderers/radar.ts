import { finite, freeformPathData, paint } from '../renderPrimitives';
import { chartText, chartTicks, CHART_COLORS } from '../chartPrimitives';
import type { RenderNode } from '../renderScene';
import type { ChartRenderContext } from './types';

export function renderRadar(context: ChartRenderContext): RenderNode[] {
  const { chart, plot, bounds, diagnostics, showLabels, showLegend, nextOrder } = context;
  const nodes: RenderNode[] = [];
  const circular = chart.chart_type === 'radial';
  const areaOpacity = Math.max(0, Math.min(1, chart.config?.areaOpacity ?? .16));
  const configured = chart.config?.categories?.filter(Boolean) ?? [];
  const dataCount = Math.max(0, ...chart.series.map(series => series.values.length));
  const categoryCount = Math.max(3, configured.length || dataCount);
  const defaults = ['Speed', 'Quality', 'Cost', 'Reliability', 'Usability'];
  const categories = Array.from({ length: categoryCount }, (_, categoryIndex) => configured[categoryIndex] ?? defaults[categoryIndex] ?? `Category ${categoryIndex + 1}`);
  const cx = plot.x + plot.width / 2, cy = plot.y + plot.height / 2;
  const labelSpace = Math.max(38, finite(chart.font_size, 12) * 3.2);
  const radius = Math.max(8, Math.min(plot.width, plot.height) / 2 - labelSpace);
  const range = chart.axis_y.max - chart.axis_y.min;
  const radial = (value: number) => (range === 0 ? 0 : Math.max(0, Math.min(1, (value - chart.axis_y.min) / range))) * radius;
  const point = (pointRadius: number, pointIndex: number) => {
    const angle = -Math.PI / 2 + pointIndex * Math.PI * 2 / categoryCount;
    return { x: cx + Math.cos(angle) * pointRadius, y: cy + Math.sin(angle) * pointRadius };
  };
  const polygon = (pointRadius: number) => `M ${Array.from({ length: categoryCount }, (_, pointIndex) => { const p = point(pointRadius, pointIndex); return `${pointIndex ? 'L ' : ''}${p.x} ${p.y}`; }).join(' ')} Z`;
  if (chart.show_grid !== false) {
    chartTicks(chart.axis_y).filter(tick => tick > chart.axis_y.min).forEach(tick => {
      const ringRadius = radial(tick);
      nodes.push(circular
        ? { type: 'ellipse', id: `chart-radial-ring-${chart.id}-${tick}`, order: nextOrder(), bounds, cx, cy, rx: ringRadius, ry: ringRadius, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } }
        : { type: 'path', id: `chart-radar-ring-${chart.id}-${tick}`, order: nextOrder(), bounds, d: polygon(ringRadius), style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } });
    });
    categories.forEach((_, categoryIndex) => { const edge = point(radius, categoryIndex); nodes.push({ type: 'path', id: `chart-radar-spoke-${chart.id}-${categoryIndex}`, order: nextOrder(), bounds, d: `M ${cx} ${cy} L ${edge.x} ${edge.y}`, style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: chart.grid_color ?? '#e2e8f0' }, strokeWidth: finite(chart.grid_width, 1) } }); });
  }
  if (showLabels) categories.forEach((category, categoryIndex) => {
    const labelPoint = point(radius + 10, categoryIndex), dx = labelPoint.x - cx, width = Math.max(64, Math.min(120, plot.width / 3));
    nodes.push(chartText(`chart-radar-label-${chart.id}-${categoryIndex}`, nextOrder(), bounds, labelPoint.x - (dx > 8 ? 0 : dx < -8 ? width : width / 2), labelPoint.y - 6, width, 30, category, chart, dx > 8 ? 'left' : dx < -8 ? 'right' : 'center'));
  });
  chart.series.forEach((series, seriesIndex) => {
    const color = series.color ?? CHART_COLORS[seriesIndex % CHART_COLORS.length], values = series.values as number[];
    const seriesPoints = categories.map((_, categoryIndex) => point(radial(values[categoryIndex] ?? chart.axis_y.min), categoryIndex));
    const seriesPath = circular ? freeformPathData(seriesPoints, .5, true) : `M ${seriesPoints.map((seriesPoint, pointIndex) => `${pointIndex ? 'L ' : ''}${seriesPoint.x} ${seriesPoint.y}`).join(' ')} Z`;
    nodes.push({ type: 'path', id: `chart-radar-fill-${chart.id}-${series.id}`, order: nextOrder(), bounds, d: seriesPath, style: { fill: paint(color, diagnostics, chart.id), stroke: { kind: 'none' }, opacity: Math.max(0, Math.min(1, series.opacity ?? areaOpacity)) } });
    nodes.push({ type: 'path', id: `chart-radar-series-${chart.id}-${series.id}`, order: nextOrder(), bounds, d: seriesPath, style: { fill: { kind: 'none' }, stroke: paint(color, diagnostics, chart.id), strokeWidth: 2, lineJoin: 'round' } });
    seriesPoints.forEach((seriesPoint, pointIndex) => nodes.push({ type: 'ellipse', id: `chart-radar-point-${chart.id}-${series.id}-${pointIndex}`, order: nextOrder(), bounds, cx: seriesPoint.x, cy: seriesPoint.y, rx: 3, ry: 3, style: { fill: paint(color, diagnostics, chart.id) } }));
  });
  return nodes;
}

