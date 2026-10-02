import type { SflGroupOut } from '../sflSemantic/sflToCanvasState';
import type { ImportBuckets, ImportGroup } from './types';

export function emptyBuckets(): ImportBuckets {
  return { notes: [], shapes: [], links: [] };
}

export function indexGroupMembership(
  groups: SflGroupOut[],
  membership = new Map<string, string>(),
): Map<string, string> {
  for (const group of groups) {
    group.entityIds.forEach(id => {
      membership.set(id, group.id);
    });
    indexGroupMembership(group.subGroups, membership);
  }
  return membership;
}

export function createBucketResolver(membership: Map<string, string>, canvas: ImportBuckets) {
  const groupBuckets = new Map<string, ImportBuckets>();
  const bucketFor = (id: string): ImportBuckets => {
    const groupId = membership.get(id);
    if (!groupId) {
      return canvas;
    }
    const bucket = groupBuckets.get(groupId) ?? emptyBuckets();
    groupBuckets.set(groupId, bucket);
    return bucket;
  };
  return { groupBuckets, bucketFor };
}

export function flattenGroups(groups: SflGroupOut[], buckets: Map<string, ImportBuckets>): ImportGroup[] {
  const flattened: ImportGroup[] = [];
  const visit = (group: SflGroupOut, parentGroupId?: string): void => {
    flattened.push({
      id: group.id,
      name: group.name,
      color: group.color,
      icon: group.icon,
      parent_group_id: parentGroupId,
      parent_frame_id: group.parentFrameId,
      entities: buckets.get(group.id) ?? emptyBuckets(),
    });
    group.subGroups.forEach(child => {
      visit(child, group.id);
    });
  };
  groups.forEach(group => {
    visit(group);
  });
  return flattened;
}
