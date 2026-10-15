import { describe, expect, it } from 'vitest';
import { parse, render } from '../src/index';

const wrap = (body: string) => `sfl 1.2\nModel M {\n${body}\n}`;

describe('";" after a nested block', () => {
  it('separates a layout block from a following style block', () => {
    const source = wrap('  Shape a { layout { position: 0, 0; size: 10, 10 }; style { fill: "#fff" } }');
    expect(() => parse(source)).not.toThrow();
  });

  it('separates a nested block from a following property', () => {
    const source = wrap('  Shape a { layout { position: 0, 0; size: 10, 10 }; text: "x" }');
    const { scene } = render(source);
    expect(scene.nodes.some(node => node.type === 'text')).toBe(true);
  });

  it('separates two sibling blocks on one line', () => {
    const source = wrap(
      '  Shape a { layout { position: 0, 0; size: 10, 10 } }; Shape b { layout { position: 20, 0; size: 10, 10 } }',
    );
    const { scene } = render(source);
    expect(scene.nodes.filter(node => node.identity?.role === 'shape').map(node => node.identity?.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('still accepts the newline-separated form it always did', () => {
    const source = wrap('  Shape a {\n    layout { position: 0, 0; size: 10, 10 }\n    style { fill: "#fff" }\n  }');
    expect(() => parse(source)).not.toThrow();
  });

  it('produces the same scene whether entries are separated by ";" or newline', () => {
    const oneLine = wrap('  Shape a { text: "hi"; layout { position: 0, 0; size: 60, 30 }; style { fill: "#fff" } }');
    const multiLine = wrap(
      '  Shape a {\n    text: "hi"\n    layout { position: 0, 0; size: 60, 30 }\n    style { fill: "#fff" }\n  }',
    );
    expect(render(oneLine).svg).toBe(render(multiLine).svg);
  });

  it('still rejects a genuinely malformed entry', () => {
    expect(() => parse(wrap('  Shape a { layout { position: 0, 0; size: 10, 10 } : }'))).toThrow();
  });
});
