import { describe, expect, it } from 'vitest';
import { sflToCanvasState } from '../src';

const doc = (repeat: string) =>
  `sfl 1.12\n\nModel M {\n  Repeat row {\n    count: 3\n    step: 20\n${repeat}    Shape s {\n      text: ""\n      layout {\n        position: x, 0\n        size: 10, trunk\n      }\n    }\n  }\n}\n`;

const heights = (source: string) => sflToCanvasState(source).canvasObjects.map(object => object.height);

describe('The names of a Repeat', () => {
  it('take a number written out, as one worked out', () => {
    expect(heights(doc('    trunk: 40\n'))).toEqual([40, 40, 40]);
    expect(heights(doc('    trunk: 20 * 2\n'))).toEqual([40, 40, 40]);
  });

  it('keep a cell by a where written out', () => {
    expect(heights(doc('    trunk: 40\n    where: false\n'))).toEqual([]);
    expect(heights(doc('    trunk: 40\n    where: true\n'))).toHaveLength(3);
  });

  it('are an error when one is nearly a word the Repeat reads and no cell uses it', () => {
    expect(() => sflToCanvasState(doc('    trunk: 40\n    colums: 5\n'))).toThrow('is it columns?');
  });
});
