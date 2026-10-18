import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createViewer } from '../src/runtime/viewer';

const SOURCE = `sfl 1.4

Model dashboard {
  Widget speed {
    type: rollingNumber
    value: 7
    digits: 2
    duration: 0
    layout { position: 20, 30; size: 240, 140 }
  }
}`;

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as typeof window.matchMedia;
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('RollingNumber Widget viewer runtime', () => {
  it('updates the SFL widget value without rebuilding the document', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const viewer = createViewer({ container, source: SOURCE });
    const surface = viewer.svg.querySelector<SVGForeignObjectElement>('[data-sf-widget="rollingNumber"]');

    expect(surface?.getAttribute('data-sf-widget-value')).toBe('07');
    expect(viewer.setWidgetValue('speed', 42)).toBe(true);
    expect(surface?.getAttribute('data-sf-widget-value')).toBe('42');
    expect(surface?.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe('42');
    expect(surface?.querySelectorAll('[data-sf-rolling-digit]')).toHaveLength(2);
  });

  it('answers to both setComponentValue and its older name setWidgetValue', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const viewer = createViewer({ container, source: SOURCE });
    const surface = viewer.svg.querySelector<SVGForeignObjectElement>('[data-sf-widget="rollingNumber"]');

    expect(viewer.setComponentValue('speed', 21)).toBe(true);
    expect(surface?.getAttribute('data-sf-widget-value')).toBe('21');
    expect(viewer.setWidgetValue('speed', 33)).toBe(true);
    expect(surface?.getAttribute('data-sf-widget-value')).toBe('33');
  });

  it('keeps a live value override after a document update', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const viewer = createViewer({ container, source: SOURCE });

    viewer.setWidgetValue('speed', 87);
    viewer.update({ source: SOURCE.replace('position: 20, 30', 'position: 40, 50') });

    const surface = viewer.svg.querySelector<SVGForeignObjectElement>('[data-sf-widget="rollingNumber"]');
    expect(surface?.getAttribute('data-sf-widget-value')).toBe('87');
  });

  it('returns false for an unknown widget', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const viewer = createViewer({ container, source: SOURCE });

    expect(viewer.setWidgetValue('missing', 1)).toBe(false);
  });
});
