import type { TextEditRect } from './geometry';

interface TextareaOptions {
  text: string;
  rect: TextEditRect;
  fontSize: number;
  fontFamily: string;
  inline?: boolean;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right';
}

const ACCENT = '#9b42df';
const STYLE_ELEMENT_ATTR = 'data-sf-text-editor-style';

function ensureEditorStyles(): void {
  if (document.head.querySelector(`[${STYLE_ELEMENT_ATTR}]`)) {
    return;
  }
  const style = document.createElement('style');
  style.setAttribute(STYLE_ELEMENT_ATTR, '');
  style.textContent = `[data-sf-text-editor]::selection{background:rgba(155,66,223,.22);color:var(--sf-text-editor-color)}`;
  document.head.appendChild(style);
}

export function createTextEditor({
  text,
  rect,
  fontSize,
  fontFamily,
  inline = false,
  color = '#0f172a',
  fontWeight,
  fontStyle,
  align = 'left',
}: TextareaOptions): HTMLTextAreaElement {
  ensureEditorStyles();
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('data-sf-text-editor', '');
  textarea.spellcheck = false;
  if (inline) {
    textarea.setAttribute('data-sf-text-editor-inline', '');
  }

  const style = textarea.style;
  style.position = 'fixed';
  style.left = `${rect.left}px`;
  style.top = `${rect.top}px`;
  style.width = `${Math.max(rect.width, 60)}px`;
  style.height = `${Math.max(rect.height, fontSize * 1.6)}px`;
  style.font = `${fontSize}px ${fontFamily}`;
  if (fontWeight) {
    style.fontWeight = fontWeight;
  }
  if (fontStyle) {
    style.fontStyle = fontStyle;
  }
  style.lineHeight = '1.3';
  style.color = color;
  style.setProperty('--sf-text-editor-color', color);
  style.caretColor = ACCENT;
  style.textAlign = align;
  style.outline = 'none';
  style.resize = 'none';
  style.boxSizing = 'border-box';
  style.zIndex = '1000';
  style.overflow = 'hidden';

  if (inline) {
    style.background = 'transparent';
    style.border = 'none';
    style.borderRadius = '0';
    style.boxShadow = 'none';
    style.padding = '0 6px';
  } else {
    style.background = '#ffffff';
    style.border = `1px solid ${ACCENT}`;
    style.borderRadius = '8px';
    style.boxShadow = '0 6px 18px rgba(15, 23, 42, 0.18), 0 0 0 3px rgba(155, 66, 223, 0.16)';
    style.padding = '5px 9px';
  }

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  return textarea;
}

export function bindTextareaAutoGrow(textarea: HTMLTextAreaElement, minHeight: number): () => void {
  const inline = textarea.hasAttribute('data-sf-text-editor-inline');
  const resize = (): void => {
    if (inline) {
      textarea.style.paddingTop = '0px';
      textarea.style.height = '0px';
      const content = textarea.scrollHeight;
      const height = Math.max(minHeight, Math.min(content, 300));
      textarea.style.height = `${height}px`;
      textarea.style.paddingTop = `${Math.max(0, (height - content) / 2)}px`;
      return;
    }
    textarea.style.height = `${minHeight}px`;
    textarea.style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, 300))}px`;
  };
  textarea.addEventListener('input', resize);
  resize();
  return () => {
    textarea.removeEventListener('input', resize);
  };
}
