import { COLOR_PICKER_CSS } from './styles';

export type ColorPickerTheme = 'light' | 'dark' | 'auto';

export type ColorPickerThemeOption = ColorPickerTheme | (() => ColorPickerTheme);

export function resolveTheme(option: ColorPickerThemeOption | undefined): ColorPickerTheme {
  return (typeof option === 'function' ? option() : option) ?? 'auto';
}

const STYLE_ID = 'sf-color-picker-styles';

export function ensureColorPickerStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) {
    return;
  }
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = COLOR_PICKER_CSS;
  doc.head.appendChild(style);
}
