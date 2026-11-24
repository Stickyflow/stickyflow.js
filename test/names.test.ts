import { describe, expect, it } from 'vitest';
import { render } from '../src';

const doc = (before: string, body: string) => `sfl 1.12\n\n${before}Model M {\n${body}}\n`;

describe('A name alone as a value', () => {
  it('is the value of a Parameter, also where no number stands', () => {
    const source = doc(
      'Parameters look {\n  accent: "#3fa89c"\n}\n\n',
      '  Shape a {\n    text: ""\n    style {\n      fill: accent\n    }\n    layout {\n      position: 0, 0\n      size: 10, 10\n    }\n  }\n',
    );
    expect(render(source).svg).toContain('#3fa89c');
  });

  it('is the value of a name of a Repeat, also where no number stands', () => {
    const source = doc(
      '',
      '  Repeat row {\n    count: 2\n    step: 20\n    tint: pick("#a01010", "#a01010")\n    Shape s {\n      text: ""\n      style {\n        fill: tint\n      }\n      layout {\n        position: x, 0\n        size: 10, 10\n      }\n    }\n  }\n',
    );
    expect(render(source).svg).toContain('#a01010');
  });

  it('stays a word when nothing is called so', () => {
    const source = doc(
      'Parameters look {\n  accent: "#3fa89c"\n}\n\n',
      '  Shape a {\n    text: "x"\n    textAlign: left\n    layout {\n      position: 0, 0\n      size: 40, 10\n    }\n  }\n',
    );
    expect(render(source).diagnostics.filter(found => found.severity === 'error')).toEqual([]);
  });
});
