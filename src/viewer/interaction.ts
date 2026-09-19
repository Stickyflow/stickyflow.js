import type { DisplayHandle } from './display';
import type { Emitter, OwnerRef } from './events';
import { bindKeyboardSelection } from './interaction/keyboard';
import { bindPointerInteraction } from './interaction/pointer';
import { SelectionController } from './interaction/selectionController';
import { bindWheelZoom } from './interaction/wheel';

export interface InteractionHandle {
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  repaint(): void;
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
  return {
    getSelection: () => selection.getOwners(),
    select: ids => selection.selectIds(ids),
    repaint: () => selection.repaint(),
    destroy() {
      unbindPointer();
      unbindWheel();
      unbindKeyboard();
    },
  };
}
