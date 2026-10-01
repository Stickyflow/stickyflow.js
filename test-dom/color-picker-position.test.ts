import { beforeEach, describe, expect, it } from 'vitest';
import { openColorPopover } from '../src/interaction/colorEdit/popover';
import type { PickerValue } from '../src/interaction/colorEdit/value';

const solidSeed: PickerValue = { mode: 'solid', color: '#6d5ef0' };
const gradientSeed: PickerValue = {
  mode: 'gradient',
  angle: 45,
  stops: [
    { color: '#111111', position: 0 },
    { color: '#222222', position: 100 },
  ],
};

const root = (): HTMLDivElement | null => document.querySelector<HTMLDivElement>('.sf-cp');
const hexField = (): HTMLInputElement | null => document.querySelector<HTMLInputElement>('.sf-cp-text');
const stopHexes = (): string[] => [...document.querySelectorAll('.sf-cp-stop-hex')].map(node => node.textContent ?? '');

const anchor = (left: number, top: number) => ({ left, top, width: 10, height: 10 });

describe('openColorPopover — where it appears', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('anchors below the clicked swatch, not a fixed (0, 0)', () => {
    openColorPopover({ seed: solidSeed, anchor: anchor(312, 48), onCommit: () => {} });
    expect(root()?.style.left).toBe('312px');
    expect(Number.parseFloat(root()?.style.top ?? '0')).toBeGreaterThan(48);
  });

  it('moves with a different anchor on the next call', () => {
    openColorPopover({ seed: solidSeed, anchor: anchor(100, 20), onCommit: () => {} }).close();
    openColorPopover({ seed: solidSeed, anchor: anchor(400, 90), onCommit: () => {} });
    expect(root()?.style.left).toBe('400px');
  });

  it('close() removes it from the document', () => {
    const handle = openColorPopover({ seed: solidSeed, anchor: anchor(0, 0), onCommit: () => {} });
    expect(root()).not.toBeNull();
    handle.close();
    expect(root()).toBeNull();
  });
});

describe('openColorPopover — theme', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('defaults to auto so the host follows the system setting', () => {
    openColorPopover({ seed: solidSeed, anchor: anchor(0, 0), onCommit: () => {} });
    expect(root()?.dataset.sfTheme).toBe('auto');
  });

  it('honours an explicit light or dark choice', () => {
    openColorPopover({ seed: solidSeed, anchor: anchor(0, 0), theme: 'dark', onCommit: () => {} }).close();
    openColorPopover({ seed: solidSeed, anchor: anchor(0, 0), theme: 'light', onCommit: () => {} });
    expect(root()?.dataset.sfTheme).toBe('light');
  });

  it('injects its stylesheet exactly once, however many popovers open', () => {
    openColorPopover({ seed: solidSeed, anchor: anchor(0, 0), onCommit: () => {} }).close();
    openColorPopover({ seed: solidSeed, anchor: anchor(0, 0), onCommit: () => {} }).close();
    expect(document.querySelectorAll('#sf-color-picker-styles')).toHaveLength(1);
  });
});

describe('openColorPopover — what it opens with', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('opens on the solid tab and seeds the hex field', () => {
    openColorPopover({ seed: solidSeed, anchor: anchor(0, 0), onCommit: () => {} });
    const [solidTab, gradientTab] = document.querySelectorAll('.sf-cp-tab');
    expect(solidTab.getAttribute('aria-selected')).toBe('true');
    expect(gradientTab.getAttribute('aria-selected')).toBe('false');
    expect(hexField()?.value).toBe('#6d5ef0');
  });

  it('hides the gradient section while on the solid tab', () => {
    openColorPopover({ seed: solidSeed, anchor: anchor(0, 0), onCommit: () => {} });
    expect(document.querySelector<HTMLElement>('.sf-cp-section')?.hidden).toBe(true);
  });

  it('opens on the gradient tab, listing every stop, when seeded with a gradient', () => {
    openColorPopover({ seed: gradientSeed, anchor: anchor(0, 0), onCommit: () => {} });
    expect(document.querySelectorAll('.sf-cp-tab')[1].getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector<HTMLElement>('.sf-cp-section')?.hidden).toBe(false);
    expect(stopHexes()).toEqual(['#111111', '#222222']);
  });

  it('edits the selected stop, not the solid color, while on the gradient tab', () => {
    const seen: string[] = [];
    openColorPopover({ seed: gradientSeed, anchor: anchor(0, 0), onCommit: value => seen.push(value) });
    const hex = hexField();
    if (!hex) {
      throw new Error('no hex field');
    }
    hex.value = '#00ff00';
    hex.dispatchEvent(new Event('change'));
    expect(seen).toEqual(['gradient(45, #00ff00 0%, #222222 100%)']);
  });
});

describe('openColorPopover — reset link', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const resetButton = () => document.querySelector<HTMLButtonElement>('.sf-cp-reset');

  it('is absent unless the caller passes onReset', () => {
    openColorPopover({ seed: solidSeed, anchor: anchor(0, 0), onCommit: () => {} });
    expect(resetButton()).toBeNull();
  });

  it('calls onReset and closes, without touching onCommit', () => {
    const committed: string[] = [];
    let reset = false;
    openColorPopover({
      seed: solidSeed,
      anchor: anchor(0, 0),
      onCommit: value => committed.push(value),
      onReset: () => {
        reset = true;
      },
    });
    resetButton()?.click();
    expect(reset).toBe(true);
    expect(committed).toEqual([]);
    expect(root()).toBeNull();
  });
});

describe('openColorPopover — gradient stops', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const addButton = () => document.querySelector<HTMLButtonElement>('.sf-cp-section-head .sf-cp-icon-btn');
  const removeButtons = () => [...document.querySelectorAll<HTMLButtonElement>('.sf-cp-stop-remove')];

  it('adds a stop between the last two and commits the result', () => {
    const seen: string[] = [];
    openColorPopover({ seed: gradientSeed, anchor: anchor(0, 0), onCommit: value => seen.push(value) });
    addButton()?.click();
    expect(stopHexes()).toHaveLength(3);
    expect(seen[0]).toMatch(/^gradient\(45, #111111 0%, #[0-9a-f]{6} 50%, #222222 100%\)$/);
  });

  it('refuses to drop below two stops', () => {
    openColorPopover({ seed: gradientSeed, anchor: anchor(0, 0), onCommit: () => {} });
    expect(removeButtons().every(button => button.disabled)).toBe(true);
  });

  it('removes a stop once a third one exists', () => {
    openColorPopover({ seed: gradientSeed, anchor: anchor(0, 0), onCommit: () => {} });
    addButton()?.click();
    expect(removeButtons()[1].disabled).toBe(false);
    removeButtons()[1].click();
    expect(stopHexes()).toEqual(['#111111', '#222222']);
  });

  it('rewrites the angle from the angle field', () => {
    const seen: string[] = [];
    openColorPopover({ seed: gradientSeed, anchor: anchor(0, 0), onCommit: value => seen.push(value) });
    const angle = document.querySelectorAll<HTMLInputElement>('.sf-cp-section .sf-cp-number')[0];
    angle.value = '270';
    angle.dispatchEvent(new Event('input'));
    angle.dispatchEvent(new Event('change'));
    expect(seen.at(-1)).toBe('gradient(270, #111111 0%, #222222 100%)');
  });
});
