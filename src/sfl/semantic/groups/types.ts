export interface SflGroupOut {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  entityIds: string[];
  subGroups: SflGroupOut[];
  parentFrameId?: string;
}
