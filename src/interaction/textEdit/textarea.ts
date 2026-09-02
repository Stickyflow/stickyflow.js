import type { TextEditRect } from './geometry';

interface TextareaOptions {
  text: string;
  rect: TextEditRect;
  fontSize: number;
  fontFamily: string;
}

export function createTextEditor({ text, rect, fontSize, fontFamily }: TextareaOptions): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  textarea.value = text;

  const style = textarea.style;
  style.position = 'fixed';
  style.left = `${rect.left}px`;
  style.top = `${rect.top}px`;
  style.width = `${Math.max(rect.width, 60)}px`;
  style.height = `${Math.max(rect.height, fontSize * 1.6)}px`;
  style.font = `${fontSize}px ${fontFamily}`;
  style.lineHeight = '1.3';
  style.color = '#0f172a';
  style.background = '#ffffff';
  style.border = '1px solid #9b42df';
  style.borderRadius = '2px';
  style.padding = '4px 6px';
  style.resize = 'none';
  style.boxSizing = 'border-box';
  style.zIndex = '1000';
  style.overflow = 'hidden';

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  return textarea;
}

export function bindTextareaAutoGrow(textarea: HTMLTextAreaElement, minHeight: number): () => void {
  const resize = (): void => {
    textarea.style.height = `${minHeight}px`;
    textarea.style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, 300))}px`;
  };
  textarea.addEventListener('input', resize);
  resize();
  return () => {
    textarea.removeEventListener('input', resize);
  };
}
