export interface QuickDuplicateOptions {
  // The id of the copy.
  shapeId: string;
  // The id of the link to the copy, or of the connection when the object is isometric.
  linkId: string;
  // The space between the object and its copy. 200 for a shape, 40 for an isometric object.
  gap?: number;
}

export type Side = 'top' | 'right' | 'bottom' | 'left';
