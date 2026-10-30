import { hexToRgb, normalizeHex, rgbToHex, rgbToHsv } from './color';
import {
  activeHex,
  appendStop,
  applyAlpha,
  applyAngle,
  applyHex,
  applyHsv,
  commit,
  type Picker,
  setActiveColor,
  setMode,
} from './popoverActions';
import { ratio, trackDrag } from './popoverDom';
import { CHANNELS, type Channel } from './popoverView';

function bindAreas(picker: Picker): Array<() => void> {
  const { matrix, hue } = picker.view;
  const done = () => commit(picker);
  return [
    trackDrag(
      matrix,
      event => {
        const rect = matrix.getBoundingClientRect();
        applyHsv(picker, {
          h: picker.state.hsv.h,
          s: ratio(event.clientX - rect.left, rect.width),
          v: 1 - ratio(event.clientY - rect.top, rect.height),
        });
      },
      done,
    ),
    trackDrag(
      hue,
      event => {
        const rect = hue.getBoundingClientRect();
        applyHsv(picker, { ...picker.state.hsv, h: ratio(event.clientY - rect.top, rect.height) * 360 });
      },
      done,
    ),
  ];
}

function bindChannel(picker: Picker, channel: Channel): void {
  const { channelRanges, channelNumbers } = picker.view;
  const fromChannel = (raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }
    const next = { ...hexToRgb(activeHex(picker)), [channel]: value };
    const nextHsv = rgbToHsv(next);
    picker.state.hsv = nextHsv.s === 0 ? { ...nextHsv, h: picker.state.hsv.h } : nextHsv;
    setActiveColor(picker, rgbToHex(next));
    picker.render();
  };
  const read = (event: Event) => (event.target as HTMLInputElement).value;
  channelRanges[channel].addEventListener('input', event => fromChannel(read(event)));
  channelRanges[channel].addEventListener('change', () => commit(picker));
  channelNumbers[channel].addEventListener('input', event => fromChannel(read(event)));
  channelNumbers[channel].addEventListener('change', () => commit(picker));
}

function bindAlpha(picker: Picker): void {
  const { alphaRange, alphaNumber } = picker.view;
  const read = (event: Event) => (event.target as HTMLInputElement).value;
  alphaRange.addEventListener('input', event => applyAlpha(picker, read(event)));
  alphaRange.addEventListener('change', () => commit(picker));
  alphaNumber.addEventListener('input', event => applyAlpha(picker, read(event)));
  alphaNumber.addEventListener('change', () => commit(picker));
}

function bindHex(picker: Picker): void {
  const { hexInput } = picker.view;
  hexInput.addEventListener('input', () => {
    const hex = normalizeHex(hexInput.value);
    if (hex) {
      applyHex(picker, hex);
    }
  });
  hexInput.addEventListener('change', () => {
    const hex = normalizeHex(hexInput.value);
    if (hex) {
      applyHex(picker, hex);
      commit(picker);
    } else {
      picker.render();
    }
  });
  hexInput.addEventListener('blur', () => picker.render());
}

function bindAngle(picker: Picker): void {
  const { angleRange, angleNumber } = picker.view;
  const read = (event: Event) => (event.target as HTMLInputElement).value;
  angleRange.addEventListener('input', event => applyAngle(picker, read(event)));
  angleRange.addEventListener('change', () => commit(picker));
  angleNumber.addEventListener('input', event => applyAngle(picker, read(event)));
  angleNumber.addEventListener('change', () => commit(picker));
}

function bindEyedropper(picker: Picker): void {
  const { eyedropper } = picker.view;
  eyedropper?.addEventListener('click', async () => {
    const Dropper = (window as unknown as { EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> } })
      .EyeDropper;
    try {
      const hex = normalizeHex((await new Dropper().open()).sRGBHex);
      if (hex) {
        applyHex(picker, hex);
        commit(picker);
      }
    } catch {
      // Escape ends the picking, which leaves the color as it is.
    }
  });
}

export function bindPickerEvents(picker: Picker): Array<() => void> {
  const { view } = picker;
  const disposers = bindAreas(picker);
  view.solidTab.addEventListener('click', () => setMode(picker, 'solid'));
  view.gradientTab.addEventListener('click', () => setMode(picker, 'gradient'));
  view.addStop.addEventListener('click', () => appendStop(picker));
  for (const channel of CHANNELS) {
    bindChannel(picker, channel);
  }
  bindAlpha(picker);
  bindHex(picker);
  bindEyedropper(picker);
  bindAngle(picker);
  return disposers;
}
