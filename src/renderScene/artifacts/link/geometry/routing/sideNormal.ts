import type { Side } from '../../../../../model/geometry/types';

export function sideNormal(side: Side): [number, number] {
  switch (side) {
    case 'top':
      return [0, -1];
    case 'right':
      return [1, 0];
    case 'bottom':
      return [0, 1];
    case 'left':
      return [-1, 0];
  }
}
