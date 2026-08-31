import type { Side } from './types'

export const SIDE_N: Record<Side, [number,number]> = {
  top:    [ 0,-1],
  right:  [ 1, 0],
  bottom: [ 0, 1],
  left:   [-1, 0],
};

