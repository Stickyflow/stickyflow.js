import type { SflBlock } from '../../../../sfl/ast';
import { asNumber, asString } from '../../../ast/valueAccess';
import type { CanvasObjectResolutionContext } from '../resolver';

export type FlowPositioner = (size: number[]) => number[] | undefined;

export function createFlowPositioner(block: SflBlock, context: CanvasObjectResolutionContext): FlowPositioner {
  const axis = asString(context.layoutProp(block, 'flow'));
  const gap = asNumber(context.layoutProp(block, 'gap')) ?? 0;
  let cursor = 0;

  return (size: number[]): number[] | undefined => {
    if (axis !== 'horizontal' && axis !== 'vertical') {
      return undefined;
    }
    const position = axis === 'horizontal' ? [cursor, 0] : [0, cursor];
    cursor += (axis === 'horizontal' ? size[0] : size[1]) + gap;
    return position;
  };
}
