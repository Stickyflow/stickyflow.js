import { describe, expect, it } from 'vitest';
import { keepTextInside } from '../src/runtime/interaction/resize/geometry';
import { captureTextFit, minHeightForText, minWidthForText } from '../src/runtime/interaction/resize/textFit';

function labelFit(rawText: string, attrs: Record<string, string> = {}) {
  const values: Record<string, string> = { 'font-size': '14', 'data-sf-line-height': '1.3', ...attrs };
  const el = { getAttribute: (name: string) => values[name] ?? null } as unknown as SVGTextElement;
  return captureTextFit({ el, rawText, strokeWidth: 2 });
}

const START = { x: 100, y: 50, width: 240, height: 90 };

describe('a resize can shrink a shape only as far as its label still fits', () => {
  const fit = labelFit('Review draft');

  it('measures the floor from the longest word and the wrapped line count', () => {
    const exact = 6 * 14 * 0.58 + 16;
    expect(minWidthForText(fit)).toBeGreaterThanOrEqual(exact);
    expect(minWidthForText(fit)).toBeLessThan(exact + 0.1);
    expect(minHeightForText(fit, 400)).toBeCloseTo(14 * 1.3 + 16, 1);
    expect(minHeightForText(fit, minWidthForText(fit))).toBeCloseTo(2 * 14 * 1.3 + 16, 1);
  });

  it('stops the right handle at the text width and keeps the left edge in place', () => {
    const dragged = { x: 100, y: 50, width: 10, height: 90 };
    const bounds = keepTextInside(dragged, START, 'right', fit);
    expect(bounds.width).toBeCloseTo(minWidthForText(fit), 6);
    expect(bounds.x).toBe(100);
  });

  it('stops the left handle at the text width and keeps the right edge in place', () => {
    const dragged = { x: 330, y: 50, width: 10, height: 90 };
    const bounds = keepTextInside(dragged, START, 'left', fit);
    expect(bounds.width).toBeCloseTo(minWidthForText(fit), 6);
    expect(bounds.x + bounds.width).toBeCloseTo(340, 6);
  });

  it('stops the top handle at the wrapped text height and keeps the bottom edge in place', () => {
    const dragged = { x: 100, y: 138, width: 240, height: 2 };
    const bounds = keepTextInside(dragged, START, 'top', fit);
    expect(bounds.height).toBeCloseTo(minHeightForText(fit, 240), 6);
    expect(bounds.y + bounds.height).toBeCloseTo(140, 6);
  });

  it('needs a taller box once a narrower width wraps the label onto more lines', () => {
    const dragged = { x: 100, y: 50, width: 10, height: 10 };
    const bounds = keepTextInside(dragged, START, 'bottom-right', fit);
    expect(bounds.width).toBeCloseTo(minWidthForText(fit), 6);
    expect(bounds.height).toBeCloseTo(minHeightForText(fit, bounds.width), 6);
    expect(bounds.height).toBeGreaterThan(minHeightForText(fit, 400));
  });

  it('leaves growing untouched', () => {
    const dragged = { x: 100, y: 50, width: 500, height: 300 };
    expect(keepTextInside(dragged, START, 'bottom-right', fit)).toEqual(dragged);
  });

  it('neither grows nor shrinks a shape that was already smaller than its text when the drag starts', () => {
    const tiny = { x: 0, y: 0, width: 30, height: 20 };
    const bounds = keepTextInside({ x: 0, y: 0, width: 20, height: 12 }, tiny, 'bottom-right', fit);
    expect(bounds.width).toBe(30);
    expect(bounds.height).toBe(20);
  });

  it('ignores an entity with no label', () => {
    const dragged = { x: 100, y: 50, width: 10, height: 10 };
    expect(keepTextInside(dragged, START, 'bottom-right', null)).toEqual(dragged);
  });

  it('accounts for bold text being wider', () => {
    expect(minWidthForText(labelFit('Review draft', { 'font-weight': 'bold' }))).toBeGreaterThan(minWidthForText(fit));
  });
});
