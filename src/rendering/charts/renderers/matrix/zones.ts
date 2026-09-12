import type { ChartZone } from '../../../../model/charts';
import type { RenderNode } from '../../../scene';
import { finite } from '../../../scene';
import { chartText, contrastTextColor, DEFAULT_MATRIX_ZONES, DEFAULT_ZONE_FILL } from '../../primitives';
import type { ChartRenderContext } from '../types';
import { matrixZoneBounds } from './geometry';
import type { MatrixGeometry, MatrixZoneBounds } from './types';

export function renderMatrixZones(context: ChartRenderContext, geometry: MatrixGeometry): RenderNode[] {
  const zones = context.chart.config?.zones?.length ? context.chart.config.zones : DEFAULT_MATRIX_ZONES;
  const cellGap = Math.max(0, finite(context.chart.config?.cellGap, 0));
  const cellRadius = Math.max(0, finite(context.chart.config?.barCornerRadius, cellGap));

  const nodes: RenderNode[] = [];
  for (let yBandIndex = 0; yBandIndex < geometry.yBandCount; yBandIndex++) {
    for (let xBandIndex = 0; xBandIndex < geometry.xBandCount; xBandIndex++) {
      const zone = zones[yBandIndex * geometry.xBandCount + xBandIndex];
      if (zone) {
        nodes.push(...renderZone(context, geometry, zone, xBandIndex, yBandIndex, cellGap, cellRadius));
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
  cellGap: number,
  cellRadius: number,
): RenderNode[] {
  const zoneBounds = insetBounds(matrixZoneBounds(geometry, xBandIndex, yBandIndex), cellGap);
  const nodes = [createZoneRect(context, zone, zoneBounds, xBandIndex, yBandIndex, cellRadius)];
  if (zone.label) {
    nodes.push(createZoneLabel(context, zone, zoneBounds, xBandIndex, yBandIndex));
  }
  return nodes;
}

function insetBounds(zoneBounds: MatrixZoneBounds, gap: number): MatrixZoneBounds {
  return {
    x: zoneBounds.x + gap / 2,
    y: zoneBounds.y + gap / 2,
    width: Math.max(0, zoneBounds.width - gap),
    height: Math.max(0, zoneBounds.height - gap),
  };
}

function createZoneRect(
  context: ChartRenderContext,
  zone: ChartZone,
  zoneBounds: MatrixZoneBounds,
  xBandIndex: number,
  yBandIndex: number,
  cellRadius: number,
): RenderNode {
  const { chart, bounds, nextOrder } = context;
  return {
    type: 'rect',
    id: `chart-matrix-zone-${chart.id}-${xBandIndex}-${yBandIndex}`,
    order: nextOrder(),
    bounds,
    ...zoneBounds,
    rx: cellRadius,
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
    ...chartText({
      id: `chart-matrix-zone-label-${chart.id}-${xBandIndex}-${yBandIndex}`,
      order: nextOrder(),
      bounds,
      frame: { x: zoneBounds.x + 6, y: zoneBounds.y + 4, width: Math.max(1, zoneBounds.width - 12), height: 16 },
      text: zone.label ?? '',
      chart,
    }),
    color: contrastTextColor(zone.color),
  };
}
