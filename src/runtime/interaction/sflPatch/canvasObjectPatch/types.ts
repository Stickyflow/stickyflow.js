export interface InsertCanvasObjectOptions {
  id: string;
  kind: 'shape' | 'frame' | 'swimlane' | 'isometric';
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Isometric objects only - the third `layout.size` value. */
  depth?: number;
  parentId?: string;
  body?: string;
}

export interface RemoveCanvasObjectOptions {
  alsoRemoveLinks?: boolean;
}

export interface InsertPathOptions {
  id: string;
  points: Array<{ x: number; y: number }>;
  closed?: boolean;
  tension?: number;
  parentId?: string;
  body?: string;
}
