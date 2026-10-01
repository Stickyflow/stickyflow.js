import { Emitter as GenericEmitter } from '../eventing/emitter';
import type { Side } from '../model/geometry/types';
import type { OwnerRef } from '../viewer';

export interface TextChangeEvent {
  owner: OwnerRef;
  text: string;
}

export interface MoveChangeEvent {
  owner: OwnerRef;
  dx: number;
  dy: number;
}

export interface ResizeChangeEvent {
  owner: OwnerRef;
  dx: number;
  dy: number;
  dWidth: number;
  dHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LinkReconnectEvent {
  owner: OwnerRef;
  end: 'from' | 'to';
  target: OwnerRef;
  side: Side;
  fraction: number;
}

export interface QuickDuplicateEvent {
  owner: OwnerRef;
  direction: 'top' | 'right' | 'bottom' | 'left';
}

export interface DeleteEvent {
  owners: OwnerRef[];
}

export interface LinkToEvent {
  owner: OwnerRef;
  direction: 'top' | 'right' | 'bottom' | 'left';
  target: OwnerRef;
  side: Side;
  fraction: number;
}

export interface ChartValueChangeEvent {
  owner: OwnerRef;
  series: string;
  index: number;
  value: number;
}

export type PropertyValue = string | number | boolean | readonly number[];

export interface PropertyChangeEvent {
  owner: OwnerRef;
  path: string;
  value: PropertyValue;
  quote?: boolean;
}

export interface ColumnResizeChangeEvent {
  owner: OwnerRef;
  columnId: string;
  width: number;
}

export interface PathPoint {
  x: number;
  y: number;
}

export interface PathPointChangeEvent {
  owner: OwnerRef;
  points: PathPoint[];
}

export interface PathDrawCompleteEvent {
  points: PathPoint[];
  closed: boolean;
  tension: number;
}

export interface InteractionEventMap {
  textChange: TextChangeEvent;
  moveChange: MoveChangeEvent;
  resizeChange: ResizeChangeEvent;
  linkReconnect: LinkReconnectEvent;
  quickDuplicate: QuickDuplicateEvent;
  linkTo: LinkToEvent;
  delete: DeleteEvent;
  chartValueChange: ChartValueChangeEvent;
  propertyChange: PropertyChangeEvent;
  columnResizeChange: ColumnResizeChangeEvent;
  pathPointChange: PathPointChangeEvent;
  pathDrawComplete: PathDrawCompleteEvent;
}

export type InteractionEventName = keyof InteractionEventMap;
export class Emitter extends GenericEmitter<InteractionEventMap> {}
export type { Unsubscribe } from '../eventing/emitter';
