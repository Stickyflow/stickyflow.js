import { describe, expect, it } from 'vitest';
import { createValueReadout, updateValueReadout } from '../src/interaction/chartValue/readout';
import type { ValueScale } from '../src/interaction/chartValue/types';

const scale: ValueScale = { plotY: 40, plotHeight: 200, min: 0, max: 140 };

function widthAt(readout: SVGGElement, value: number): number {
  updateValueReadout(readout, { centerX: 100, scale }, value);
  return Number(readout.querySelector('rect')?.getAttribute('width'));
}

describe('the readout box does not resize as the value rounds', () => {
  it('is the same width whether the value lands on a whole number or a decimal', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    document.body.appendChild(svg);
    const readout = createValueReadout(svg);

    const whole = widthAt(readout, 60);
    const decimal = widthAt(readout, 60.1);
    expect(whole).toBe(decimal);
  });

  it('stays the same width across many values within the same drag', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    document.body.appendChild(svg);
    const readout = createValueReadout(svg);

    const widths = new Set([0, 1, 12.3, 60, 60.04, 60.06, 99.9, 140].map(v => widthAt(readout, v)));
    expect(widths.size).toBe(1);
  });

  it('is wide enough to hold the longest value it can show', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    document.body.appendChild(svg);
    const readout = createValueReadout(svg);

    updateValueReadout(readout, { centerX: 100, scale }, 139.9);
    const width = Number(readout.querySelector('rect')?.getAttribute('width'));
    const shownChars = readout.querySelector('text')?.textContent?.length ?? 0;
    expect(width).toBeGreaterThan(shownChars * 5);
  });

  it('reserves room for a minus sign when the scale allows negative values', () => {
    const withMinus: ValueScale = { plotY: 40, plotHeight: 200, min: -50, max: 50 };
    const positiveOnly: ValueScale = { plotY: 40, plotHeight: 200, min: 0, max: 50 };
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    document.body.appendChild(svg);
    const readout = createValueReadout(svg);

    updateValueReadout(readout, { centerX: 100, scale: withMinus }, 0);
    const negativeWidth = Number(readout.querySelector('rect')?.getAttribute('width'));

    updateValueReadout(readout, { centerX: 100, scale: positiveOnly }, 0);
    const positiveWidth = Number(readout.querySelector('rect')?.getAttribute('width'));

    expect(negativeWidth).toBeGreaterThan(positiveWidth);
  });
});
