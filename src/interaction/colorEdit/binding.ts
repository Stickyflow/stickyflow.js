import type { Viewer } from '../../viewer';
import type { Emitter } from '../events';
import type { EditableRules } from '../propertyEdit/editable';
import { ColorEditSession } from './session';
import { resolveBarColorEditTarget, resolveColorEditTarget } from './target';
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
  const swatch = new ColorEditSession(svg, emitter, rules, theme, resolveColorEditTarget);
  const mark = new ColorEditSession(svg, emitter, rules, theme, resolveBarColorEditTarget);

  svg.addEventListener('click', swatch.trigger, true);
  svg.addEventListener('dblclick', mark.trigger, true);

  return {
    destroy() {
      swatch.cancel();
      mark.cancel();
      svg.removeEventListener('click', swatch.trigger, true);
      svg.removeEventListener('dblclick', mark.trigger, true);
    },
  };
}
