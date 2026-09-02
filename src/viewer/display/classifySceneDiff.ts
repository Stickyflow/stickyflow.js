import type { SceneDiff } from './types';

/** Pure classification, no DOM — split out so it is unit-testable directly
 *  (see test/viewer-pure.test.ts) without a browser to exercise
 *  patchSceneNodes itself. An owner only appears in the result if something
 *  about it was actually touched; a pure reorder (paint order changed, no
 *  attribute or content difference) never reaches `touchedOwnerIds` and so is
 *  correctly absent from all three lists. */
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
