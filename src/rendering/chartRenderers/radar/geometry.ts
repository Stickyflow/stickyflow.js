import { finite } from '../../renderPrimitives';
import type { ChartRenderContext } from '../types';
import type { RadarGeometry, RadarPoint } from './types';

const DEFAULT_CATEGORIES = ['Speed', 'Quality', 'Cost', 'Reliability', 'Usability'];

export function createRadarGeometry(context: ChartRenderContext): RadarGeometry {
  const { chart, plot } = context;
  const configuredCategories = chart.config?.categories?.filter(Boolean) ?? [];
  const dataCount = Math.max(0, ...chart.series.map(series => series.values.length));
  const categoryCount = Math.max(3, configuredCategories.length || dataCount);
  const categories = createCategories(configuredCategories, categoryCount);
  const centerX = plot.x + plot.width / 2;
  const centerY = plot.y + plot.height / 2;
  const labelSpace = Math.max(38, finite(chart.font_size, 12) * 3.2);
  const radius = Math.max(8, Math.min(plot.width, plot.height) / 2 - labelSpace);
  const axisRange = chart.axis_y.max - chart.axis_y.min;
  const radiusForValue = (value: number): number => {
    const ratio = axisRange === 0 ? 0 : Math.max(0, Math.min(1, (value - chart.axis_y.min) / axisRange));
    return ratio * radius;
  };
  const pointAt = (pointRadius: number, pointIndex: number): RadarPoint => {
    const angle = -Math.PI / 2 + (pointIndex * Math.PI * 2) / categoryCount;
    return {
      x: centerX + Math.cos(angle) * pointRadius,
      y: centerY + Math.sin(angle) * pointRadius,
    };
  };
  const polygonPath = (pointRadius: number): string => createPolygonPath(pointRadius, categoryCount, pointAt);

  return {
    circular: chart.chart_type === 'radial',
    areaOpacity: Math.max(0, Math.min(1, chart.config?.areaOpacity ?? 0.16)),
    categories,
    centerX,
    centerY,
    radius,
    radiusForValue,
    pointAt,
    polygonPath,
  };
}

function createCategories(configured: string[], categoryCount: number): string[] {
  return Array.from(
    { length: categoryCount },
    (_, index) => configured[index] ?? DEFAULT_CATEGORIES[index] ?? `Category ${index + 1}`,
  );
}

function createPolygonPath(
  radius: number,
  categoryCount: number,
  pointAt: (radius: number, index: number) => RadarPoint,
): string {
  const commands = Array.from({ length: categoryCount }, (_, index) => {
    const point = pointAt(radius, index);
    return `${index ? 'L ' : ''}${point.x} ${point.y}`;
  });
  return `M ${commands.join(' ')} Z`;
}
