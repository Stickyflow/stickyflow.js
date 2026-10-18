import type { BindingRuntime } from '../../binding';
import type { Viewer } from './types';

export interface KeyboardOptions {
  enabled?: () => boolean;
}

const ACTIVATION_KEYS = new Set([' ', 'Enter']);

function operatedId(runtime: BindingRuntime, target: EventTarget | null): string | null {
  const node = target instanceof Element ? target.closest('[data-sf-primary][data-sf-id]') : null;
  const id = node?.getAttribute('data-sf-id') ?? null;
  return id && runtime.interactive.pressable.has(id) ? id : null;
}

export function connectKeyboard(viewer: Viewer, runtime: BindingRuntime, options: KeyboardOptions = {}): () => void {
  const focusChanged = (event: FocusEvent, focused: boolean) => {
    const id = operatedId(runtime, event.target);
    if (id) {
      runtime.setElementState(id, { focused });
    }
  };
  const activate = (event: KeyboardEvent) => {
    if (!ACTIVATION_KEYS.has(event.key) || event.repeat || options.enabled?.() === false) {
      return;
    }
    const id = operatedId(runtime, event.target);
    if (id) {
      event.preventDefault();
      runtime.activate(id);
    }
  };
  const listeners: Array<[string, (event: never) => void]> = [
    ['focusin', (event: FocusEvent) => focusChanged(event, true)],
    ['focusout', (event: FocusEvent) => focusChanged(event, false)],
    ['keydown', activate],
  ];
  for (const [type, listener] of listeners) {
    viewer.svg.addEventListener(type, listener as EventListener);
  }
  return () => {
    for (const [type, listener] of listeners) {
      viewer.svg.removeEventListener(type, listener as EventListener);
    }
  };
}
