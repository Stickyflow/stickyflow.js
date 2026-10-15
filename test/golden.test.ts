import { describe, expect, it } from 'vitest';
import { render, renderCanvas } from '../src/index';
import { fixtures, SFL_SAMPLE } from './fixtures';

describe('golden SVG snapshots', () => {
  for (const [name, input] of Object.entries(fixtures)) {
    it(`renders "${name}" to its golden SVG`, async () => {
      const { svg } = renderCanvas(input);
      await expect(svg).toMatchFileSnapshot(`./__golden__/${name}.svg`);
    });
  }

  it('renders the SFL sample end-to-end to its golden SVG', async () => {
    const { svg } = render(SFL_SAMPLE);
    await expect(svg).toMatchFileSnapshot('./__golden__/sfl-sample.svg');
  });
});

describe('determinism — identical input yields byte-identical output', () => {
  for (const [name, input] of Object.entries(fixtures)) {
    it(`"${name}" is stable across repeated renders`, () => {
      expect(renderCanvas(input).svg).toBe(renderCanvas(input).svg);
    });
  }

  it('SFL sample is stable across repeated renders', () => {
    expect(render(SFL_SAMPLE).svg).toBe(render(SFL_SAMPLE).svg);
  });
});
