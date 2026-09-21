import { describe, expect, it } from 'vitest';
import { render } from '../src/index';

const SFL = `sfl 1.4

Model M {
  Entity e { text: "Hello"; layout { position: 0, 0; size: 100, 60 } }
}`;

describe('render() caches the parsed scene by source text', () => {
  it('reuses the same scene object across two calls with the same source', () => {
    const first = render(SFL);
    const second = render(SFL);
    expect(second.scene).toBe(first.scene);
  });

  it('still applies a fresh idPrefix per call, despite sharing the cached scene', () => {
    const a = render(SFL, { idPrefix: 'a-' });
    const b = render(SFL, { idPrefix: 'b-' });
    expect(a.scene).toBe(b.scene);
    expect(a.svg).toContain('id="sf-a--shape-e"');
    expect(b.svg).toContain('id="sf-b--shape-e"');
    expect(a.svg).not.toBe(b.svg);
  });

  it('bypasses the cache entirely when a custom measureText is given, and does not pollute it', () => {
    const wide = () => ({ measure: () => 1000, spaceWidth: 1000 });
    const withCustomMeasure = render(SFL, { measureText: wide });
    const plainBefore = render(SFL);
    expect(withCustomMeasure.scene).not.toBe(plainBefore.scene);

    const plainAfter = render(SFL);
    expect(plainAfter.scene).toBe(plainBefore.scene);
  });

  it('recomputes correctly once the LRU cap evicts an entry', () => {
    const variant = (n: number) => `sfl 1.4

Model M {
  Entity e { text: "v${n}"; layout { position: 0, 0; size: 100, 60 } }
}`;
    for (let n = 0; n < 60; n++) {
      render(variant(n));
    }
    const { svg, diagnostics } = render(variant(0));
    expect(diagnostics).toEqual([]);
    expect(svg).toContain('v0');
  });
});
