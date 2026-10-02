export interface OverlayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

export type LinkEndpoint = 'from' | 'to';
export type QuickDuplicateDirection = 'top' | 'right' | 'bottom' | 'left';
