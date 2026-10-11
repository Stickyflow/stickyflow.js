import type { IsometricFace } from '../../../../model/isometricObject';

export interface SflConnectionOut {
  id: string;
  fromId?: string;
  toId?: string;
  fromFace: IsometricFace;
  toFace: IsometricFace;
  order?: number;
  sourceIndex?: number;
  props: Record<string, string>;
}
