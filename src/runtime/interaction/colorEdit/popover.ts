import { hexToHsv } from './color';
import type { Picker } from './popoverActions';
import { bindPickerEvents } from './popoverEvents';
import { renderPicker } from './popoverRender';
import { type Anchor, buildPickerView, clampIntoViewport } from './popoverView';
import { type ColorPickerTheme, ensureColorPickerStyles } from './theme';
import { type PickerValue, toGradient, toSolid } from './value';

export interface ColorPopoverOptions {
  seed: PickerValue;
  anchor: Anchor;
  theme?: ColorPickerTheme;
  allowGradient?: boolean;
  lockStops?: boolean;
  onCommit(value: string): void;
  onReset?(): void;
}

export interface ColorPopoverHandle {
  close(): void;
}

export function openColorPopover(options: ColorPopoverOptions): ColorPopoverHandle {
  const { seed, anchor, onCommit, onReset } = options;
  const allowGradient = options.allowGradient ?? true;
  const lockStops = options.lockStops ?? false;
  ensureColorPickerStyles(document);

  const solid = toSolid(seed);
  const view = buildPickerView({ anchor, theme: options.theme, allowGradient, lockStops, withReset: Boolean(onReset) });
  const picker: Picker = {
    view,
    lockStops,
    onCommit,
    state: {
      mode: allowGradient ? seed.mode : 'solid',
      solid,
      gradient: toGradient(seed),
      selected: 0,
      hsv: hexToHsv(solid),
    },
    render: () => renderPicker(picker),
  };

  const root = view.root;
  document.body.appendChild(root);
  clampIntoViewport(root, anchor);

  const disposers = bindPickerEvents(picker);
  view.resetButton?.addEventListener('click', () => {
    onReset?.();
    close();
  });

  const onOutsideClick = (event: MouseEvent) => {
    if (!root.contains(event.target as Node)) {
      close();
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  const attach = window.setTimeout(() => {
    document.addEventListener('mousedown', onOutsideClick, true);
    document.addEventListener('keydown', onKeyDown);
  }, 0);

  function close(): void {
    window.clearTimeout(attach);
    document.removeEventListener('mousedown', onOutsideClick, true);
    document.removeEventListener('keydown', onKeyDown);
    for (const dispose of disposers) {
      dispose();
    }
    root.remove();
  }

  picker.render();

  return { close };
}
