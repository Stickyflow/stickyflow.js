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
  /** Isometric axis-handle resize only - the new depth, when that's the
   *  dimension being dragged. Unset for every other resize gesture. */
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
  /** Slot in the link's `segments:` offsets: 1 first inner segment, 2 middle, 3 last inner. */
  index: number;
  /** Perpendicular offset from the default route, in diagram units. */
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

// A free-form drag of a Sankey node, released. dx/dy are deltas from this
// gesture alone (in the chart's own user-space units) - the patch function
// adds them to whatever offset the node already carries, so repeated drags
// accumulate rather than overwrite.
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
  propertyChange: PropertyChangeEvent;
  pathPointChange: PathPointChangeEvent;
  pathDrawComplete: PathDrawCompleteEvent;
  sankeyNodeMove: SankeyNodeMoveEvent;
  sankeyNodeRename: SankeyNodeRenameEvent;
}

export type InteractionEventName = keyof InteractionEventMap;
export class Emitter extends GenericEmitter<InteractionEventMap> {}
export type { Unsubscribe } from '../eventing/emitter';
