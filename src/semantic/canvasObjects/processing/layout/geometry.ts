import type { SflBlock, SflValue } from '../../../../sfl/ast';
import { asNumber, tupleValues } from '../../../ast/valueAccess';

type LayoutProperty = (block: SflBlock, key: string) => SflValue | undefined;

export interface CanvasObjectGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number | undefined;
  order: number | undefined;
}

export function readCanvasObjectGeometry(
  block: SflBlock,
  origin: { x: number; y: number },
  layoutProperty: LayoutProperty,
  positionOverride?: number[],
): CanvasObjectGeometry {
  const position = positionOverride ?? tupleValues(layoutProperty(block, 'position')) ?? [0, 0];
  const size = tupleValues(layoutProperty(block, 'size')) ?? [0, 0];

  return {
    x: origin.x + (position[0] ?? 0),
    y: origin.y + (position[1] ?? 0),
    width: size[0] ?? 0,
    height: size[1] ?? 0,
    rotation: asNumber(layoutProperty(block, 'rotation')),
    order: asNumber(layoutProperty(block, 'order')),
  };
}
