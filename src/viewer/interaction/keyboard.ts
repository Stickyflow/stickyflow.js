import type { SelectionController } from './selectionController';

export function bindKeyboardSelection(
  svg: SVGSVGElement,
  selection: SelectionController,
  selectable: boolean,
): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (selectable && event.key === 'Escape') {
      selection.dispatch({ type: 'clear' });
    }
  };
  svg.addEventListener('keydown', onKeyDown);
  return () => {
    svg.removeEventListener('keydown', onKeyDown);
  };
}
