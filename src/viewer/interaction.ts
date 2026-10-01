import type { DisplayHandle } from './display';
import type { Emitter, OwnerRef } from './events';
import { createChangeFlash } from './interaction/changeFlash';
import { bindKeyboardSelection } from './interaction/keyboard';
import { bindPointerInteraction } from './interaction/pointer';
import { SelectionController } from './interaction/selectionController';
import { bindWheelZoom } from './interaction/wheel';

export interface InteractionHandle {
  getSelection(): OwnerRef[];
  select(ids: string[]): void;
  repaint(): void;
  /** Briefly flash a ring/halo around each given owner id (change-highlighting).
   *  Ids that no longer resolve to a live node are silently skipped. `color`
   *  overrides the default amber — a host passes its own to tell categories of
   *  external change apart (e.g. a bulk/tool-driven rewrite vs. an edit). */
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
