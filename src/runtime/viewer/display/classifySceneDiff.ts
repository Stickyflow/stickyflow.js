import type { SceneDiff } from './types';

export function classifySceneDiff(
  oldOwnerIds: ReadonlySet<string>,
  newOwnerIds: ReadonlySet<string>,
  touchedOwnerIds: ReadonlySet<string>,
): SceneDiff {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  for (const id of touchedOwnerIds) {
    const wasPresent = oldOwnerIds.has(id);
    const isPresent = newOwnerIds.has(id);
    if (isPresent && !wasPresent) {
      added.push(id);
    } else if (wasPresent && !isPresent) {
      removed.push(id);
    } else if (wasPresent && isPresent) {
      changed.push(id);
    }
  }
  return { added, removed, changed };
}
