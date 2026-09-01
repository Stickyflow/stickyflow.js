import type { OwnerRef } from '../../viewer';
import type { Emitter } from '../events';

interface ActiveTextEditorOptions {
  textarea: HTMLTextAreaElement;
  owner: OwnerRef;
  originalText: string;
  emitter: Emitter;
  unbindAutoGrow: () => void;
  onClose: () => void;
}

export class ActiveTextEditor {
  readonly #textarea: HTMLTextAreaElement;
  readonly #owner: OwnerRef;
  readonly #originalText: string;
  readonly #emitter: Emitter;
  readonly #unbindAutoGrow: () => void;
  readonly #onClose: () => void;
  #closed = false;

  constructor(options: ActiveTextEditorOptions) {
    this.#textarea = options.textarea;
    this.#owner = options.owner;
    this.#originalText = options.originalText;
    this.#emitter = options.emitter;
    this.#unbindAutoGrow = options.unbindAutoGrow;
    this.#onClose = options.onClose;
    options.textarea.addEventListener('keydown', this.keyDown);
    options.textarea.addEventListener('blur', this.commit);
  }

  readonly commit = (): void => {
    const text = this.#textarea.value;
    this.close();
    if (text !== this.#originalText) {
      this.#emitter.emit('textChange', { owner: this.#owner, text });
    }
  };

  readonly cancel = (): void => {
    this.close();
  };

  private readonly keyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.commit();
    }
  };

  private close(): void {
    if (this.#closed) {
      return;
    }

    this.#closed = true;
    this.#textarea.removeEventListener('keydown', this.keyDown);
    this.#textarea.removeEventListener('blur', this.commit);
    this.#unbindAutoGrow();
    this.#textarea.remove();
    this.#onClose();
  }
}
