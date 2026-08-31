export type SelectionAction =
  | { type: 'clear' }
  | { type: 'set'; ids: string[] }
  | { type: 'select'; id: string }
  | { type: 'toggle'; id: string }
  | { type: 'add'; id: string };

export function selectionReducer(current: ReadonlySet<string>, action: SelectionAction): Set<string> {
  switch (action.type) {
    case 'clear':
      return new Set();
    case 'set':
      return new Set(action.ids);
    case 'select':
      return new Set([action.id]);
    case 'add':
      return new Set([...current, action.id]);
    case 'toggle': {
      const next = new Set(current);
      if (next.has(action.id)) next.delete(action.id);
      else next.add(action.id);
      return next;
    }
  }
}

export function clickAction(id: string, modifiers: { shift: boolean; ctrl: boolean; meta: boolean }): SelectionAction {
  return modifiers.ctrl || modifiers.meta || modifiers.shift ? { type: 'toggle', id } : { type: 'select', id };
}
