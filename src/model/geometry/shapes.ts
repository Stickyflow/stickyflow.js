import type { ShapeType } from '../shapes';

const polygonPath = (points: number[]): string =>
  points.length < 4
    ? ''
    : `M ${points[0]} ${points[1]} ${points.slice(2).reduce((s, n, i) => s + (i % 2 ? ` ${n}` : ` L ${n}`), '')} Z`;

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
      const wave = height * 0.15;
      return (
        `M ${x} ${y} H ${x + width} V ${y + height - wave} ` +
        `Q ${x + width * 0.875} ${y + height + wave * 0.15} ${x + width * 0.75} ${y + height - wave} ` +
        `Q ${x + width * 0.625} ${y + height + wave * 0.15} ${x + width * 0.5} ${y + height - wave} ` +
        `Q ${x + width * 0.375} ${y + height + wave * 0.15} ${x + width * 0.25} ${y + height - wave} ` +
        `Q ${x + width * 0.125} ${y + height + wave * 0.15} ${x} ${y + height - wave} Z`
      );
    }
    default:
      return null;
  }
}
