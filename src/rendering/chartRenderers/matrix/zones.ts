import type { ChartZone } from '../../../model/charts';
import { chartText, contrastTextColor, DEFAULT_ZONE_FILL } from '../../chartPrimitives';
import type { RenderNode } from '../../scene';
import type { ChartRenderContext } from '../types';
import { matrixZoneBounds } from './geometry';
import type { MatrixGeometry, MatrixZoneBounds } from './types';

export function renderMatrixZones(context: ChartRenderContext, geometry: MatrixGeometry): RenderNode[] {
  const zones = context.chart.config?.zones ?? [];
  if (!zones.length) {
    return [];
  }

  const nodes: RenderNode[] = [];
  for (let yBandIndex = 0; yBandIndex < geometry.yBandCount; yBandIndex++) {
    for (let xBandIndex = 0; xBandIndex < geometry.xBandCount; xBandIndex++) {
      const zone = zones[yBandIndex * geometry.xBandCount + xBandIndex];
      if (zone) {
        nodes.push(...renderZone(context, geometry, zone, xBandIndex, yBandIndex));
      }
    }
  }
  return nodes;
}

function renderZone(
  context: ChartRenderContext,
  geometry: MatrixGeometry,
  zone: ChartZone,
  xBandIndex: number,
  yBandIndex: number,
): RenderNode[] {
  const zoneBounds = matrixZoneBounds(geometry, xBandIndex, yBandIndex);
  const nodes = [createZoneRect(context, zone, zoneBounds, xBandIndex, yBandIndex)];
  if (zone.label) {
    nodes.push(createZoneLabel(context, zone, zoneBounds, xBandIndex, yBandIndex));
  }
  return nodes;
}

function createZoneRect(
  context: ChartRenderContext,
  zone: ChartZone,
  zoneBounds: MatrixZoneBounds,
  xBandIndex: number,
  yBandIndex: number,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    type: 'rect',
    id: `chart-matrix-zone-${chart.id}-${xBandIndex}-${yBandIndex}`,
    order: nextOrder(),
    bounds,
    ...zoneBounds,
    style: { fill: { kind: 'solid', color: zone.color ?? DEFAULT_ZONE_FILL } },
  };
}

function createZoneLabel(
  context: ChartRenderContext,
  zone: ChartZone,
  zoneBounds: MatrixZoneBounds,
  xBandIndex: number,
  yBandIndex: number,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    ...chartText(
      `chart-matrix-zone-label-${chart.id}-${xBandIndex}-${yBandIndex}`,
      nextOrder(),
      bounds,
      zoneBounds.x + 6,
      zoneBounds.y + 4,
      zoneBounds.width - 12,
      16,
      zone.label ?? '',
      chart,
    ),
    color: contrastTextColor(zone.color),
  };
}
