import { describe, expect, it } from 'vitest';
import { render } from '../src';
import { removeCanvasObject } from '../src/runtime/interaction';

const doc = (repeat: string) => `sfl 1.6\n\nModel M {\n${repeat}}\n`;
const dots = (extra = '') => `  Repeat r {
    columns: 3
    rows: 2
    step: 20, 20
${extra}
    Shape dot {
      layout {
        position: x, y
        size: 10, 10
      }
    }
  }
`;
const ids = (source: string) =>
  [...render(source).svg.matchAll(/id="(sf-shape-[^"]+)"/g)].map(match => match[1]).sort();

describe('removing a block that a Repeat made', () => {
  it('keeps its cell out of the Repeat and leaves every other cell as it was', () => {
    const before = doc(dots());
    const after = removeCanvasObject(before, 'dot_1_1');
    expect(ids(after)).toEqual(ids(before).filter(id => id !== 'sf-shape-dot_1_1'));
    expect(after).toContain('where: (col != 1 || row != 1)');
  });

  it('adds to a where that is there and keeps its meaning', () => {
    const before = doc(dots('    where: col < 2\n'));
    const once = removeCanvasObject(before, 'dot_0_0');
    const twice = removeCanvasObject(once, 'dot_1_1');
    expect(ids(twice)).toEqual(['sf-shape-dot_0_1', 'sf-shape-dot_1_0']);
  });

  it('keeps the random numbers of the other cells', () => {
    const before = doc(dots('    seed: 4\n    jitter: 6\n    size: random(5, 15)\n'));
    const after = removeCanvasObject(before, 'dot_2_0');
    const pick = (source: string, id: string) => render(source).svg.match(new RegExp(`id="sf-shape-${id}"[^>]*`))?.[0];
    expect(pick(after, 'dot_0_1')).toBe(pick(before, 'dot_0_1'));
  });

  it('leaves a document alone when the name is not there', () => {
    const before = doc(dots());
    expect(removeCanvasObject(before, 'nothing_9_9')).toBe(before);
  });
});
