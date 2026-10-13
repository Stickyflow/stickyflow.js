import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';

const SOURCE = `sfl 1.4

Model dashboard {
  Widget speed {
    type: rollingNumber
    value: 7
    digits: 2
    duration: 360
    label: "KM/H"
    layout { position: 20, 30; size: 240, 140 }
    style {
      color: "#ffffff"
      surface: "rgba(255, 255, 255, 0.12)"
      divider: "rgba(255, 255, 255, 0.18)"
    }
  }
}`;

describe('RollingNumber Widget', () => {
  it('is represented as a first-class SFL canvas object', () => {
    const widget = sflToCanvasState(SOURCE).canvasObjects[0];

    expect(widget.objectType).toBe('widget');
    expect(widget.id).toBe('speed');
    expect(widget.widget).toEqual({ type: 'rollingNumber', value: '7', digits: 2, duration: 360, label: 'KM/H' });
  });

  it('renders a static initial value without a browser runtime', () => {
    const { svg } = render(SOURCE);

    expect(svg).toContain('data-sf-role="widget"');
    expect(svg).toContain('data-sf-id="speed"');
    expect(svg).toContain('data-sf-widget="rollingNumber"');
    expect(svg).toContain('data-sf-widget-value="07"');
    expect(svg).toContain('rgba(255, 255, 255, 0.12)');
  });

  it('reports and skips unknown widget types', () => {
    const result = render(SOURCE.replace('rollingNumber', 'unknownDisplay'));

    expect(result.svg).not.toContain('data-sf-widget=');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'unsupported-widget-type', ownerId: 'speed' }),
    );
  });
});
