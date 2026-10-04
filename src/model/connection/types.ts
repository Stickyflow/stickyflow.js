import type { IsometricFace } from '../isometricObject';
import type { LinkStyle } from '../link';

export interface Connection {
  id: string;
  fromId?: string;
  toId?: string;
  fromFace: IsometricFace;
  toFace: IsometricFace;
  style?: LinkStyle;
  order?: number;
}
