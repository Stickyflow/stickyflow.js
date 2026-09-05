import type { Viewer } from '../../viewer';
import type { Emitter } from '../events';
import type { EditableRules } from '../propertyEdit/editable';
import { ColorEditSession } from './session';

export interface ColorEditHandle {
  destroy(): void;
}

export function bindColorEdit(viewer: Viewer, emitter: Emitter, rules: EditableRules | undefined): ColorEditHandle {
  const svg = viewer.svg;
  const session = new ColorEditSession(emitter, rules);

  svg.addEventListener('click', session.click, true);

  return {
    destroy() {
      svg.removeEventListener('click', session.click, true);
    },
  };
}
