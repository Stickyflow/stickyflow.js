import type { Side } from '../../../../ast';

export interface SflLinkOut {
  id: string;
  fromId?: string;
  toId?: string;
  text?: string;
  fromSide?: Side;
  fromFraction?: number;
  toSide?: Side;
  toFraction?: number;
  fromPort?: string;
  toPort?: string;
  order?: number;
  segments?: number[];
  props: Record<string, string>;
}
