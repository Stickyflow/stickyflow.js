import type { Modifiers } from '../events';

export function modifiersOf(event: MouseEvent | KeyboardEvent): Modifiers {
  return {
    shift: event.shiftKey,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    alt: event.altKey,
  };
}
