import type { IsometricFace } from '../../../../model/isometricObject';

export interface InsertConnectionOptions {
  id: string;
  fromId: string;
  toId: string;
  fromFace: IsometricFace;
  toFace: IsometricFace;
  body?: string;
}
