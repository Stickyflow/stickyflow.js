import type { Viewer } from '../../viewer';
import type { Emitter } from '../events';
import type { EditableRules } from '../propertyEdit/editable';
import { ColorEditSession } from './session';
import { resolveBarColorEditTarget, resolveColorEditTarget, snapshotSelectionBeforeGesture } from './target';
import type { ColorPickerThemeOption } from './theme';
import { ZoneGradientSession } from './zoneGradientSession';

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
  const zoneGradient = new ZoneGradientSession(svg, emitter, rules, theme);
  const onPointerDown = () => snapshotSelectionBeforeGesture(svg);

  svg.addEventListener('pointerdown', onPointerDown, true);
  svg.addEventListener('click', swatch.trigger, true);
  svg.addEventListener('click', zoneGradient.trigger, true);
  svg.addEventListener('dblclick', mark.trigger, true);

  return {
    destroy() {
      swatch.cancel();
      mark.cancel();
      zoneGradient.cancel();
      svg.removeEventListener('pointerdown', onPointerDown, true);
      svg.removeEventListener('click', swatch.trigger, true);
      svg.removeEventListener('click', zoneGradient.trigger, true);
      svg.removeEventListener('dblclick', mark.trigger, true);
    },
  };
}
