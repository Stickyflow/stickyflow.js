import type { DisplayHandle } from '../display';
import type { Emitter, OwnerRef } from '../events';
import { createChangeFlash } from './changeFlash';
import { bindKeyboardSelection } from './keyboard';
import { bindPointerInteraction } from './pointer';
import { SelectionController } from './selectionController';
import { bindWheelZoom } from './wheel';

export interface InteractionHandle {
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  repaint(): void;
  flashChanged(ownerIds: readonly string[], color?: string): void;
  destroy(): void;
}

export interface BindInteractionOptions {
  selectable?: boolean;
}

export function bindInteraction(
  display: DisplayHandle,
  emitter: Emitter,
  diagramId: string,
  options: BindInteractionOptions = {},
): InteractionHandle {
  const selectable = options.selectable ?? true;
  const selection = new SelectionController(display.svg, emitter, diagramId);
  const unbindPointer = bindPointerInteraction({ display, emitter, diagramId, selection, selectable });
  const unbindWheel = bindWheelZoom(display, selection);
  const unbindKeyboard = bindKeyboardSelection(display.svg, selection, selectable);
  const changeFlash = createChangeFlash(display.svg);
  return {
    getSelection: () => selection.getOwners(),
    select: ids => selection.selectIds(ids),
    repaint: () => selection.repaint(),
    flashChanged: (ownerIds, color) => changeFlash.flash(ownerIds, color),
    destroy() {
      unbindPointer();
      unbindWheel();
      unbindKeyboard();
      changeFlash.destroy();
    },
  };
}
