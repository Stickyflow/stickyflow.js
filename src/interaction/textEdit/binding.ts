import type { Viewer } from '../../viewer';
import type { Emitter } from '../events';
import { TextEditingSession } from './session';

export interface TextEditingHandle {
  destroy(): void;
}

export function bindTextEditing(viewer: Viewer, emitter: Emitter): TextEditingHandle {
  const svg = viewer.svg;
  const session = new TextEditingSession(svg, emitter);

  svg.addEventListener('dblclick', session.doubleClick);

  return {
    destroy() {
      session.cancel();
      svg.removeEventListener('dblclick', session.doubleClick);
    },
  };
}
