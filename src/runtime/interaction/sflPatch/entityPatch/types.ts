export interface InsertEntityOptions {
  id: string;
  kind: 'shape' | 'frame' | 'swimlane' | 'table';
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId?: string;
  body?: string;
}

export interface RemoveEntityOptions {
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
