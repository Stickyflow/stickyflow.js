import type { Side } from '../../../model/geometry/router';

export interface InsertLinkOptions {
  id: string;
  fromId: string;
  toId: string;
  fromSide?: Side;
  fromFraction?: number;
  toSide?: Side;
  toFraction?: number;
  text?: string;
  body?: string;
}

export interface LinkEndpointTextOptions {
  id: string;
  side?: Side;
  fraction?: number;
}
