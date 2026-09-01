import type { Bounds, RenderNode } from '../scene';

const ERROR_CAP_HALF = 5;

export function errorBarRange(value: number, error: number | [number, number]): [number, number] {
  return Array.isArray(error) ? [value - error[0], value + error[1]] : [value - error, value + error];
}

export function errorWhiskerNode(
  id: string,
  order: number,
  bounds: Bounds,
  center: number,
  y1: number,
  y2: number,
  color: string,
  series: string,
  valueIndex: number,
): RenderNode {
  const path = `M ${center} ${y1} L ${center} ${y2} M ${center - ERROR_CAP_HALF} ${y1} L ${center + ERROR_CAP_HALF} ${y1} M ${center - ERROR_CAP_HALF} ${y2} L ${center + ERROR_CAP_HALF} ${y2}`;
  return {
    type: 'path',
    id,
    order,
    bounds,
    d: path,
    detail: { of: 'chartValue', series, valueIndex },
    style: { fill: { kind: 'none' }, stroke: { kind: 'solid', color }, strokeWidth: 1 },
  };
}
