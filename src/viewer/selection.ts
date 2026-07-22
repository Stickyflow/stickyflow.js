// Pure selection state (no DOM). The viewer keeps the set of selected owner ids;
// the interaction layer only dispatches actions and re-reads state. Kept pure so
// selection behaviour is fully node-testable and later reusable for mutation.
export type SelectionAction =
  | { type: 'clear' }
  | { type: 'set'; ids: string[] }
  | { type: 'select'; id: string }        // replace selection with just this id
  | { type: 'toggle'; id: string }        // add/remove (multi-select, e.g. ctrl)
  | { type: 'add'; id: string };

/** Reduce a selection to the next selection. Returns a new Set (immutable-in). */
export function selectionReducer(current: ReadonlySet<string>, action: SelectionAction): Set<string> {
  switch (action.type) {
    case 'clear': return new Set();
    case 'set': return new Set(action.ids);
    case 'select': return new Set([action.id]);
    case 'add': return new Set([...current, action.id]);
    case 'toggle': {
      const next = new Set(current);
      if (next.has(action.id)) next.delete(action.id); else next.add(action.id);
      return next;
    }
  }
}

/** Interpret a click's modifiers into the selection action it should cause. */
export function clickAction(id: string, modifiers: { shift: boolean; ctrl: boolean; meta: boolean }): SelectionAction {
  return modifiers.ctrl || modifiers.meta || modifiers.shift
    ? { type: 'toggle', id }
    : { type: 'select', id };
}
