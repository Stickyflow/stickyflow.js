export interface SflGroupOut {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  canvasObjectIds: string[];
  subGroups: SflGroupOut[];
  parentFrameId?: string;
}
