import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBindingRuntime, createDataSource } from '../src/binding';
import { connectInteraction, createViewer } from '../src/runtime/viewer';

const sfl = `sfl 1.4

DataSource settings {
  mode: record
  fields {
    wifi: boolean
  }
}

Model board {
  Component wifi {
    type: switch
    value: <-> settings.wifi
    label: "Wi-Fi"
    layout {
      position: 10, 10
      size: 52, 30
    }
  }
  Text focus {
    text: <- when(wifi.focused, "focused", "idle")
    layout {
      position: 10, 60
      size: 80, 20
    }
  }
}
`;

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;
});

afterEach(() => {
  document.body.innerHTML = '';
});

function mount() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const runtime = createBindingRuntime(sfl);
  const settings = createDataSource({ wifi: false });
  runtime.registerSource('settings', settings);
  const viewer = createViewer({ container, source: sfl, interactive: true });
  runtime.attach(viewer);
  const disconnect = connectInteraction(viewer, runtime);
  const control = () => viewer.svg.querySelector<SVGElement>('[data-sf-id="wifi"][data-sf-primary]');
  vi.spyOn(control() as SVGElement, 'getBoundingClientRect').mockReturnValue({
    left: 10,
    top: 10,
    right: 62,
    bottom: 40,
    width: 52,
    height: 30,
    x: 10,
    y: 10,
    toJSON: () => ({}),
  });
  return { viewer, runtime, settings, disconnect, control };
}

const pointer = (type: string) =>
  new MouseEvent(type, { clientX: 30, clientY: 20, button: 0, bubbles: true, cancelable: true });

describe('a switch in a viewer with a binding runtime', () => {
  it('describes itself to assistive technology', () => {
    const { viewer, control } = mount();
    expect(control()?.getAttribute('role')).toBe('switch');
    expect(control()?.getAttribute('aria-checked')).toBe('false');
    expect(control()?.getAttribute('aria-label')).toBe('Wi-Fi');
    expect(control()?.getAttribute('tabindex')).toBe('0');
    viewer.destroy();
  });

  it('turns on with a click of the pointer and writes the field', () => {
    const { viewer, runtime, settings, disconnect, control } = mount();
    control()?.dispatchEvent(pointer('pointerdown'));
    control()?.dispatchEvent(pointer('pointerup'));
    runtime.flush();
    expect(settings.get()).toEqual({ wifi: true });
    expect(control()?.getAttribute('aria-checked')).toBe('true');
    disconnect();
    viewer.destroy();
  });

  it('turns on and off with the space bar and the enter key', () => {
    const { viewer, runtime, settings, disconnect, control } = mount();
    control()?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(settings.get()).toEqual({ wifi: true });
    control()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(settings.get()).toEqual({ wifi: false });
    runtime.flush();
    disconnect();
    viewer.destroy();
  });

  it('ignores other keys and a held key', () => {
    const { viewer, settings, disconnect, control } = mount();
    control()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    control()?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true }));
    expect(settings.get()).toEqual({ wifi: false });
    disconnect();
    viewer.destroy();
  });

  it('reports keyboard focus as state that an expression can read', () => {
    const { viewer, runtime, disconnect, control } = mount();
    const label = () => viewer.svg.textContent ?? '';
    expect(label()).toContain('idle');
    control()?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    runtime.flush();
    expect(label()).toContain('focused');
    control()?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    runtime.flush();
    expect(label()).toContain('idle');
    disconnect();
    viewer.destroy();
  });

  it('stops answering to the keyboard once it is disconnected', () => {
    const { viewer, settings, disconnect, control } = mount();
    disconnect();
    control()?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(settings.get()).toEqual({ wifi: false });
    viewer.destroy();
  });
});
