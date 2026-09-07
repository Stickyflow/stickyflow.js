import type { Viewer } from '../../viewer';
import type { Emitter } from '../events';
import type { EditableRules } from '../propertyEdit/editable';
import { ColorEditSession } from './session';
import type { ColorPickerThemeOption } from './theme';

export interface ColorEditHandle {
  destroy(): void;
}

export function bindColorEdit(
  viewer: Viewer,
  emitter: Emitter,
  rules: EditableRules | undefined,
  theme?: ColorPickerThemeOption,
): ColorEditHandle {
  const svg = viewer.svg;
  const session = new ColorEditSession(svg, emitter, rules, theme);

  svg.addEventListener('click', session.click, true);

  return {
    destroy() {
      session.cancel();
      svg.removeEventListener('click', session.click, true);
    },
  };
}
