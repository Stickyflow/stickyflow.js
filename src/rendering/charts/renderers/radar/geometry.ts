import { finite } from '../../../scene';
import {
  type RadarFrame,
  radarCategoryCount,
  radarPointAt,
  radarRadius,
  radarRadiusForValue,
  radarSeriesPath,
} from '../../primitives/radarShape';
import type { ChartRenderContext } from '../types';
import type { RadarFamilyChart, RadarGeometry, RadarPoint } from './types';

const DEFAULT_CATEGORIES = ['Speed', 'Quality', 'Cost', 'Reliability', 'Usability'];

export function radarFrameFor(context: ChartRenderContext<RadarFamilyChart>): RadarFrame {
  const { chart, plot } = context;
  const configuredCount = (chart.config?.categories?.filter(Boolean) ?? []).length;
  const dataCount = Math.max(0, ...chart.series.map(series => series.values.length));
  return {
    centerX: plot.x + plot.width / 2,
    centerY: plot.y + plot.height / 2,
    radius: radarRadius(plot.width, plot.height, finite(chart.fontSize, 12), context.showLabels),
    min: chart.axisY.min,
    max: chart.axisY.max,
    count: radarCategoryCount(configuredCount, dataCount),
    curved: chart.chartType === 'radial',
  };
}

export function createRadarGeometry(context: ChartRenderContext<RadarFamilyChart>): RadarGeometry {
  const { chart } = context;
  const configuredCategories = chart.config?.categories?.filter(Boolean) ?? [];
  const frame = radarFrameFor(context);
  const categories = createCategories(configuredCategories, frame.count);
  const pointAt = (pointRadius: number, pointIndex: number): RadarPoint => radarPointAt(frame, pointIndex, pointRadius);

  return {
    circular: frame.curved,
    areaOpacity: Math.max(0, Math.min(1, chart.config?.areaOpacity ?? 0.16)),
    categories,
    centerX: frame.centerX,
    centerY: frame.centerY,
    radius: frame.radius,
    radiusForValue: (value: number): number => radarRadiusForValue(frame, value),
    pointAt,
    polygonPath: (pointRadius: number): string =>
      radarSeriesPath(
        categories.map((_, index) => pointAt(pointRadius, index)),
        false,
      ),
  };
}

function createCategories(configured: string[], categoryCount: number): string[] {
  return Array.from(
    { length: categoryCount },
    (_, index) => configured[index] ?? DEFAULT_CATEGORIES[index] ?? `Category ${index + 1}`,
  );
}
