import { describe, expect, it } from 'vitest';
import { render } from '../src';

const shape = (name: string, x: number) =>
  `  Shape ${name} {\n    layout {\n      position: ${x}, 0\n      size: 40, 40\n    }\n  }\n`;
const doc = (body: string) => `sfl 1.5\n\nModel M {\n${body}}\n`;
const codes = (source: string) => render(source).diagnostics.map(item => item.code);

describe('duplicate names', () => {
  it('warns when two blocks have one name', () => {
    expect(codes(doc(shape('a', 0) + shape('a', 50)))).toContain('duplicate-name');
  });

  it('warns when two Repeat blocks make blocks from templates of one name', () => {
    const repeat = (name: string) =>
      `  Repeat ${name} {\n    columns: 2\n    step: 20, 20\n\n    Shape dot {\n      layout {\n        position: x, y\n        size: 10, 10\n      }\n    }\n  }\n`;
    expect(codes(doc(repeat('one') + repeat('two')))).toContain('duplicate-name');
  });

  it('does not warn when every name is its own', () => {
    expect(codes(doc(shape('a', 0) + shape('b', 50)))).not.toContain('duplicate-name');
  });
});
