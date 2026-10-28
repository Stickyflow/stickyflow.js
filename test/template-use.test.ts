import { describe, expect, it } from 'vitest';
import { canonicalize, render, sflToCanvasState } from '../src';
import { removeCanvasObject } from '../src/runtime/interaction';

const TREE = `Template tree {
  color: "#c4315f"
  height: 40

  Isometric trunk {
    layout {
      position: x, y
      size: 4, height, 4
    }
    style {
      fill: "#8e3f4d"
    }
  }

  Isometric crown {
    layout {
      position: x - 4, y - height
      size: 12, height * 1.6, 12
    }
    style {
      fill: color
    }
  }
}
`;
const doc = (body: string) => `sfl 1.6\n\n${TREE}\nModel M {\n${body}}\n`;
const use = (name: string, extra = '', at = '120, 80') => `  Use ${name} : tree {\n    at: ${at}\n${extra}  }\n`;
const idsOf = (source: string) => sflToCanvasState(source).canvasObjects.map(object => object.id);

describe('Template and Use', () => {
  it('makes the blocks of a Template at the place of the Use, with its own values', () => {
    const source = doc(use('a', '    color: "#3fa89c"\n    height: 50\n') + use('b', '', '180, 100'));
    const state = sflToCanvasState(source);
    const find = (id: string) => state.canvasObjects.find(object => object.id === id);
    expect(idsOf(source)).toEqual(['a_trunk', 'a_crown', 'b_trunk', 'b_crown']);
    expect(find('a_trunk')).toMatchObject({ x: 120, y: 80, height: 50 });
    expect(find('a_crown')).toMatchObject({ x: 116, y: 30, height: 80 });
    expect(find('b_trunk')).toMatchObject({ x: 180, y: 100, height: 40 });
    const svg = render(source).svg;
    expect(svg).toContain('#3fa89c');
    expect(svg).toContain('#c4315f');
  });

  it('keeps the Template and the Use when the text is written again', () => {
    const source = doc(use('a'));
    const again = canonicalize(source);
    expect(again).toContain('Template tree {');
    expect(again).toContain('Use a : tree {');
    expect(idsOf(again)).toEqual(idsOf(source));
  });

  it('can be used by a Repeat, with random numbers that differ from cell to cell and stay the same', () => {
    const source = doc(`  Repeat forest {
    count: 3
    step: 40, 0
    seed: 2

    Use t : tree {
      at: x, 200
      height: random(22, 52)
    }
  }
`);
    const first = sflToCanvasState(source)
      .canvasObjects.filter(object => object.id.endsWith('_trunk'))
      .map(object => object.height);
    const second = sflToCanvasState(source)
      .canvasObjects.filter(object => object.id.endsWith('_trunk'))
      .map(object => object.height);
    expect(idsOf(source)).toEqual(['t_0_trunk', 't_0_crown', 't_1_trunk', 't_1_crown', 't_2_trunk', 't_2_crown']);
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(3);
  });

  it('is an error when a Use names no Template, gives a value to no parameter, or a Template uses itself', () => {
    expect(() => sflToCanvasState(doc(use('a').replace(': tree', ': none')))).toThrow('there is no Template none');
    expect(() => sflToCanvasState(doc(use('a', '    sky: 1\n')))).toThrow('has no parameter sky');
    const loop = `sfl 1.6\n\nTemplate again {\n  Use inner : again {\n    at: 0, 0\n  }\n}\n\nModel M {\n  Use first : again {\n    at: 0, 0\n  }\n}\n`;
    expect(() => sflToCanvasState(loop)).toThrow('nested');
  });

  it('is removed with the Use that made it', () => {
    const source = doc(use('a') + use('b', '', '180, 100'));
    const after = removeCanvasObject(source, 'a_crown');
    expect(idsOf(after)).toEqual(['b_trunk', 'b_crown']);
    expect(after).not.toContain('Use a');
  });

  it('is removed with its cell when the Use is in a Repeat', () => {
    const source = doc(`  Repeat forest {
    count: 3
    step: 40, 0

    Use t : tree {
      at: x, 200
    }
  }
`);
    const after = removeCanvasObject(source, 't_1_crown');
    expect(idsOf(after)).toEqual(['t_0_trunk', 't_0_crown', 't_2_trunk', 't_2_crown']);
  });

  it('leaves a document without a Template as it is', () => {
    const plain = `sfl 1.6\n\nModel M {\n  Shape a {\n    layout {\n      position: 0, 0\n      size: 10, 10\n    }\n  }\n}\n`;
    expect(idsOf(plain)).toEqual(['a']);
  });
});
