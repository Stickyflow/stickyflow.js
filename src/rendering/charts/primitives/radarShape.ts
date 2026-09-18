import { freeformPathData } from '../../scene/freeformPath';

export interface RadarPoint {
  x: number;
  y: number;
}

export interface RadarFrame {
  centerX: number;
  centerY: number;
  radius: number;
  min: number;
  max: number;
  count: number;
  curved: boolean;
}

const START_ANGLE = -Math.PI / 2;
const CURVED_TENSION = 0.5;
const LABEL_FREE_MARGIN = 6;

export function radarLabelSpace(fontSize: number): number {
  return Math.max(38, fontSize * 3.2);
}

export function radarRadius(plotWidth: number, plotHeight: number, fontSize: number, hasLabels = true): number {
  const margin = hasLabels ? radarLabelSpace(fontSize) : LABEL_FREE_MARGIN;
  return Math.max(8, Math.min(plotWidth, plotHeight) / 2 - margin);
}

export function radarCategoryCount(configuredCount: number, dataCount: number): number {
  return Math.max(3, configuredCount || dataCount);
}

export function radarAngleAt(count: number, index: number): number {
  return START_ANGLE + (index * Math.PI * 2) / count;
}

export function angleForAxisValue(min: number, max: number, value: number): number {
  const ratio = max === min ? 0 : (value - min) / (max - min);
  return START_ANGLE + ratio * Math.PI * 2;
}

export function radarPointAt(frame: RadarFrame, index: number, pointRadius: number): RadarPoint {
  const angle = radarAngleAt(frame.count, index);
  return {
    x: frame.centerX + Math.cos(angle) * pointRadius,
    y: frame.centerY + Math.sin(angle) * pointRadius,
  };
}

export function radarRadiusForValue(frame: RadarFrame, value: number): number {
  const range = frame.max - frame.min;
  const ratio = range === 0 ? 0 : Math.max(0, Math.min(1, (value - frame.min) / range));
  return ratio * frame.radius;
}

export function radarVertexPoint(frame: RadarFrame, index: number, value: number): RadarPoint {
  return radarPointAt(frame, index, radarRadiusForValue(frame, value));
}

export function radarValueAtPoint(frame: RadarFrame, index: number, px: number, py: number): number {
  const angle = radarAngleAt(frame.count, index);
  const projected = (px - frame.centerX) * Math.cos(angle) + (py - frame.centerY) * Math.sin(angle);
  const ratio = frame.radius === 0 ? 0 : Math.max(0, Math.min(1, projected / frame.radius));
  return frame.min + ratio * (frame.max - frame.min);
}

export function radarSeriesPath(points: RadarPoint[], curved: boolean): string {
  if (points.length === 0) {
    return '';
  }
  if (curved) {
    return freeformPathData({ points, tension: CURVED_TENSION, closed: true });
  }
  const commands = points.map((point, index) => `${index ? 'L ' : ''}${point.x} ${point.y}`);
  return `M ${commands.join(' ')} Z`;
}
