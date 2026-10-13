import { screenRectOf } from '../../dom';
import type { Emitter } from '../events';
import { ActiveTextEditor } from '../textEdit/activeEditor';
import { bindTextareaAutoGrow, createTextEditor } from '../textEdit/textarea';
import type { EditableRules } from './editable';
import { type PropertyTarget, resolvePropertyTarget } from './target';

const MIN_EDIT_WIDTH = 120;
const EDIT_WIDTH_MARGIN = 48;

export class PropertyEditingSession {
  readonly #emitter: Emitter;
  readonly #rules: EditableRules | undefined;
  #activeEditor: ActiveTextEditor | null = null;

  constructor(emitter: Emitter, rules: EditableRules | undefined) {
    this.#emitter = emitter;
    this.#rules = rules;
  }

  readonly doubleClick = (event: MouseEvent): void => {
    const target = resolvePropertyTarget(event, this.#rules);
    if (!target) {
      return;
    }
    event.stopPropagation();
    this.begin(target);
  };

  cancel(): void {
    this.#activeEditor?.cancel();
  }

  private begin(target: PropertyTarget): void {
    this.cancel();

    const { node } = target;
    const rect = screenRectOf(node);
    const fontSize = Number.parseFloat(node.getAttribute('font-size') || '12');
    const originalText = node.textContent ?? '';
    const anchor = node.getAttribute('text-anchor');
    const align = anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';
    const fill = node.getAttribute('fill');
    const width = Math.max(rect.width + EDIT_WIDTH_MARGIN, MIN_EDIT_WIDTH);
    const shift = align === 'center' ? (width - rect.width) / 2 : align === 'right' ? width - rect.width : 0;
    const previousVisibility = node.getAttribute('visibility');

    // Edited in place like a shape label: no box, the text keeps its own look.
    const textarea = createTextEditor({
      text: originalText,
      rect: { ...rect, left: rect.left - shift, width },
      fontSize,
      fontFamily: node.getAttribute('font-family') || 'sans-serif',
      inline: true,
      color: fill && fill !== 'none' ? fill : undefined,
      fontWeight: node.getAttribute('font-weight') ?? undefined,
      align,
    });
    node.setAttribute('visibility', 'hidden');

    this.#activeEditor = new ActiveTextEditor({
      textarea,
      originalText,
      commit: value => this.#emitter.emit('propertyChange', { owner: target.owner, path: target.path, value }),
      unbindAutoGrow: bindTextareaAutoGrow(textarea, Math.max(rect.height, fontSize * 1.6)),
      onClose: () => {
        if (node.isConnected) {
          if (previousVisibility === null) {
            node.removeAttribute('visibility');
          } else {
            node.setAttribute('visibility', previousVisibility);
          }
        }
        this.#activeEditor = null;
      },
    });
  }
}
