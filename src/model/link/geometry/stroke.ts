import type { GradientColor } from '../../color';
import type { StrokeStyle } from '../types';

export const getLinkGradientStrokeProps = (colorValue: string | GradientColor | null | undefined, points: number[]) => {
  if (!colorValue || typeof colorValue === 'string' || colorValue.type !== 'gradient') {
    return {};
  }

  if (points.length < 4) {
    return {};
  }

  const colorStops: (number | string)[] = [];
  colorValue.stops.forEach(stop => {
    colorStops.push(stop.position / 100);
    colorStops.push(stop.color);
  });

  return {
    strokeLinearGradientStartPoint: { x: points[0], y: points[1] },
    strokeLinearGradientEndPoint: { x: points[points.length - 2], y: points[points.length - 1] },
    strokeLinearGradientColorStops: colorStops,
  };
};

export const getDashArray = (strokeWidth: number, strokeStyle: StrokeStyle): number[] | undefined => {
  switch (strokeStyle) {
    case 'dashed':
      return [strokeWidth * 8, strokeWidth * 4];
    case 'dotted':
      return [strokeWidth * 2, strokeWidth * 3];
    case 'solid':
    default:
      return undefined;
  }
};
