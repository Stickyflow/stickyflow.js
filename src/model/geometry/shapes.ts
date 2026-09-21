import type { ShapeType } from '../shapes';
import { cloudPath } from './cloud';

const polygonPath = (points: number[]): string =>
  points.length < 4
    ? ''
    : `M ${points[0]} ${points[1]} ${points.slice(2).reduce((s, n, i) => s + (i % 2 ? ` ${n}` : ` L ${n}`), '')} Z`;

const DOCUMENT_WAVE_AMPLITUDE = 0.1;
const QUARTER_SINE_SLOPE = Math.PI / 6;
const NOTE_FOLD_RATIO = 0.25;
const PREDEFINED_PROCESS_BAR_RATIO = 0.15;

export function localShapePath(type: ShapeType, x: number, y: number, width: number, height: number): string | null {
  const p = (...coords: number[]) => polygonPath(coords);
  switch (type) {
    case 'diamond':
      return p(x + width / 2, y, x + width, y + height / 2, x + width / 2, y + height, x, y + height / 2);
    case 'triangle':
      return p(x + width / 2, y, x, y + height, x + width, y + height);
    case 'parallelogram':
      return p(x + width * 0.15, y, x + width, y, x + width * 0.85, y + height, x, y + height);
    case 'trapezoid':
      return p(x + width * 0.2, y, x + width * 0.8, y, x + width, y + height, x, y + height);
    case 'hexagon': {
      const cut = Math.min(width, height) / 4;
      return p(
        x + cut,
        y,
        x + width - cut,
        y,
        x + width,
        y + height / 2,
        x + width - cut,
        y + height,
        x + cut,
        y + height,
        x,
        y + height / 2,
      );
    }
    case 'document': {
      const amplitude = height * DOCUMENT_WAVE_AMPLITUDE;
      const mid = y + height - amplitude;
      const quarter = width / 4;
      const slope = amplitude * QUARTER_SINE_SLOPE;
      return (
        `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${mid} ` +
        `C ${x + width - quarter / 3} ${mid - slope} ${x + width - (quarter * 2) / 3} ${mid - amplitude} ${x + width - quarter} ${mid - amplitude} ` +
        `C ${x + width - quarter - quarter / 3} ${mid - amplitude} ${x + width / 2 + quarter / 3} ${mid - slope} ${x + width / 2} ${mid} ` +
        `C ${x + width / 2 - quarter / 3} ${mid + slope} ${x + width / 2 - (quarter * 2) / 3} ${mid + amplitude} ${x + quarter} ${mid + amplitude} ` +
        `C ${x + quarter - quarter / 3} ${mid + amplitude} ${x + quarter / 3} ${mid + slope} ${x} ${mid} Z`
      );
    }
    case 'note': {
      const fold = Math.min(width, height) * NOTE_FOLD_RATIO;
      return (
        `M ${x} ${y} L ${x + width - fold} ${y} L ${x + width} ${y + fold} L ${x + width} ${y + height} L ${x} ${y + height} Z ` +
        `M ${x + width} ${y + fold} L ${x + width - fold} ${y + fold} L ${x + width - fold} ${y}`
      );
    }
    case 'cloud':
      return cloudPath(x, y, width, height);
    case 'predefined_process': {
      const bar = Math.min(width, height) * PREDEFINED_PROCESS_BAR_RATIO;
      return (
        `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z ` +
        `M ${x + bar} ${y} L ${x + bar} ${y + height} M ${x + width - bar} ${y} L ${x + width - bar} ${y + height}`
      );
    }
    default:
      return null;
  }
}
