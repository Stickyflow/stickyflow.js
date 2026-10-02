import type { Viewer } from '../../viewer';
import type { ColorPickerThemeOption } from '../colorEdit/theme';
import type { Emitter } from '../events';
import type { EditableRules } from './editable';
import { PropertyEditingSession } from './session';

export interface PropertyEditingOptions {
  editable?: EditableRules;
  colorPickerTheme?: ColorPickerThemeOption;
}

export interface PropertyEditingHandle {
  destroy(): void;
}

export function bindPropertyEditing(
  viewer: Viewer,
  emitter: Emitter,
  options: PropertyEditingOptions = {},
): PropertyEditingHandle {
  const svg = viewer.svg;
  const session = new PropertyEditingSession(emitter, options.editable);

  svg.addEventListener('dblclick', session.doubleClick, true);

  return {
    destroy() {
      session.cancel();
      svg.removeEventListener('dblclick', session.doubleClick, true);
    },
  };
}
