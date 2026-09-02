import type { Bounds, RenderNode } from '../scene';

const ERROR_CAP_HALF = 5;

interface VerticalErrorWhisker {
  id: string;
  order: number;
  bounds: Bounds;
  geometry: {
    centerX: number;
    startY: number;
    endY: number;
  };
  color: string;
  valueReference: {
    seriesId: string;
    valueIndex: number;
  };
}

export function errorBarRange(value: number, error: number | [number, number]): [number, number] {
  return Array.isArray(error) ? [value - error[0], value + error[1]] : [value - error, value + error];
}

export function createVerticalErrorWhiskerNode(whisker: VerticalErrorWhisker): RenderNode {
  return {
    type: 'path',
    id: whisker.id,
    order: whisker.order,
    bounds: whisker.bounds,
    d: verticalErrorWhiskerPath(whisker.geometry),
    detail: {
      of: 'chartValue',
      series: whisker.valueReference.seriesId,
      valueIndex: whisker.valueReference.valueIndex,
    },
    style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color: whisker.color }, strokeWidth: 1 },
  };
}

function verticalErrorWhiskerPath(geometry: VerticalErrorWhisker['geometry']): string {
  const { centerX, startY, endY } = geometry;
  const capStartX = centerX - ERROR_CAP_HALF;
  const capEndX = centerX + ERROR_CAP_HALF;
  return `M ${centerX} ${startY} L ${centerX} ${endY} M ${capStartX} ${startY} L ${capEndX} ${startY} M ${capStartX} ${endY} L ${capEndX} ${endY}`;
}
