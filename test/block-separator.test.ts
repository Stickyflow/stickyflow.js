import { describe, expect, it } from 'vitest';
import { parse, render } from '../src/index';

// ";" as an entry separator inside a block. It always worked between two
// properties (parseProperty -> consumeTerminator), but a nested
// block/layout/style entry ends at its own "}" with nothing consumed after it,
// so the same separator at the same nesting level threw. Only one-line SFL
// needs an explicit separator at all — which is exactly the style the docs
// site's showcase fixtures are written in, and why two of them wouldn't parse.

const wrap = (body: string) => `sfl 1.2\nModel M {\n${body}\n}`;

describe('";" after a nested block', () => {
  it('separates a layout block from a following style block', () => {
    const source = wrap('  Entity a { layout { position: 0, 0; size: 10, 10 }; style { fill: "#fff" } }');
    expect(() => parse(source)).not.toThrow();
  });

  it('separates a nested block from a following property', () => {
    const source = wrap('  Entity a { layout { position: 0, 0; size: 10, 10 }; text: "x" }');
    const { scene } = render(source);
    expect(scene.nodes.some(node => node.type === 'text')).toBe(true);
  });

  it('separates two sibling blocks on one line', () => {
    const source = wrap(
      '  Entity a { layout { position: 0, 0; size: 10, 10 } }; Entity b { layout { position: 20, 0; size: 10, 10 } }',
    );
    const { scene } = render(source);
    expect(scene.nodes.filter(node => node.identity?.role === 'entity').map(node => node.identity?.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('still accepts the newline-separated form it always did', () => {
    const source = wrap('  Entity a {\n    layout { position: 0, 0; size: 10, 10 }\n    style { fill: "#fff" }\n  }');
    expect(() => parse(source)).not.toThrow();
  });

  it('produces the same scene whether entries are separated by ";" or newline', () => {
    const oneLine = wrap('  Entity a { text: "hi"; layout { position: 0, 0; size: 60, 30 }; style { fill: "#fff" } }');
    const multiLine = wrap(
      '  Entity a {\n    text: "hi"\n    layout { position: 0, 0; size: 60, 30 }\n    style { fill: "#fff" }\n  }',
    );
    expect(render(oneLine).svg).toBe(render(multiLine).svg);
  });

  it('still rejects a genuinely malformed entry', () => {
    expect(() => parse(wrap('  Entity a { layout { position: 0, 0; size: 10, 10 } : }'))).toThrow();
  });
});
