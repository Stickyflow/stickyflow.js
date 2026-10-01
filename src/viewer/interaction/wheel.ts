import { isCameraGesture } from '../../domContract';
import type { DisplayHandle } from '../display';
import type { SelectionController } from './selectionController';

export function bindWheelZoom(display: DisplayHandle, selection: SelectionController): () => void {
  const onWheel = (event: WheelEvent) => {
    if (!isCameraGesture(event)) {
      return;
    }
    event.preventDefault();
    display.zoomBy(event.deltaY < 0 ? 1.1 : 1 / 1.1, event.clientX, event.clientY);
    selection.repaint();
  };
  display.svg.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    display.svg.removeEventListener('wheel', onWheel);
  };
}
