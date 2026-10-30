export interface InsertCanvasObjectOptions {
  id: string;
  kind: 'shape' | 'text' | 'image' | 'frame' | 'swimlane' | 'isometric';
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth?: number;
  parentId?: string;
  body?: string;
}

export interface RemoveCanvasObjectOptions {
  alsoRemoveLinks?: boolean;
}

export interface InsertPathOptions {
  id: string;
  points: Array<{ x: number; y: number; tension?: number }>;
  closed?: boolean;
  tension?: number;
  parentId?: string;
  body?: string;
}
