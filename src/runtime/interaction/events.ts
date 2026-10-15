import type { Side } from '../../model/geometry/types';
import { Emitter as GenericEmitter } from '../eventing/emitter';
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
  depth?: number;
}

export interface LinkReconnectEvent {
  owner: OwnerRef;
  end: 'from' | 'to';
  target: OwnerRef;
  side: Side;
  fraction: number;
}

export interface LinkSegmentChangeEvent {
  owner: OwnerRef;
  index: number;
  offset: number;
}

export type IsometricQuickDuplicateDirection =
  | 'iso-width-pos'
  | 'iso-width-neg'
  | 'iso-depth-pos'
  | 'iso-depth-neg'
  | 'iso-height-pos'
  | 'iso-height-neg';

export interface QuickDuplicateEvent {
  owner: OwnerRef;
  direction: 'top' | 'right' | 'bottom' | 'left' | IsometricQuickDuplicateDirection;
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

export interface ChartValuePreviewEvent {
  owner: OwnerRef;
  series: string;
  index: number;
  value: number | null;
}

export type PropertyValue = string | number | boolean | readonly number[];

export interface PropertyChangeEvent {
  owner: OwnerRef;
  path: string;
  value: PropertyValue;
  quote?: boolean;
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

export interface SankeyNodeMoveEvent {
  owner: OwnerRef;
  nodeId: string;
  dx: number;
  dy: number;
}

export interface SankeyNodeRenameEvent {
  owner: OwnerRef;
  nodeId: string;
  label: string;
}

export interface InteractionEventMap {
  textChange: TextChangeEvent;
  moveChange: MoveChangeEvent;
  resizeChange: ResizeChangeEvent;
  linkReconnect: LinkReconnectEvent;
  linkSegmentChange: LinkSegmentChangeEvent;
  quickDuplicate: QuickDuplicateEvent;
  linkTo: LinkToEvent;
  delete: DeleteEvent;
  chartValueChange: ChartValueChangeEvent;
  chartValuePreview: ChartValuePreviewEvent;
  propertyChange: PropertyChangeEvent;
  pathPointChange: PathPointChangeEvent;
  pathDrawComplete: PathDrawCompleteEvent;
  sankeyNodeMove: SankeyNodeMoveEvent;
  sankeyNodeRename: SankeyNodeRenameEvent;
}

export type InteractionEventName = keyof InteractionEventMap;
export class Emitter extends GenericEmitter<InteractionEventMap> {}
export type { Unsubscribe } from '../eventing/emitter';
