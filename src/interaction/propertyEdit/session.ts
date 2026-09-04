import { screenRectOf } from '../../domContract';
import type { Emitter } from '../events';
import { ActiveTextEditor } from '../textEdit/activeEditor';
import { bindTextareaAutoGrow, createTextEditor } from '../textEdit/textarea';
import type { EditableRules } from './editable';
import { type PropertyTarget, resolvePropertyTarget } from './target';

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

    const rect = screenRectOf(target.node);
    const fontSize = Number.parseFloat(target.node.getAttribute('font-size') || '12');
    const originalText = target.node.textContent ?? '';
    const textarea = createTextEditor({
      text: originalText,
      rect: { ...rect, width: Math.max(rect.width, 80) },
      fontSize,
      fontFamily: target.node.getAttribute('font-family') || 'sans-serif',
    });

    this.#activeEditor = new ActiveTextEditor({
      textarea,
      originalText,
      commit: value => this.#emitter.emit('propertyChange', { owner: target.owner, path: target.path, value }),
      unbindAutoGrow: bindTextareaAutoGrow(textarea, Math.max(rect.height, fontSize * 1.6)),
      onClose: () => {
        this.#activeEditor = null;
      },
    });
  }
}
