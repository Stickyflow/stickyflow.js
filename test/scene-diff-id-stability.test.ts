import { describe, expect, it } from 'vitest';
import { render } from '../src/index';
import { SFL_SAMPLE } from './fixtures';

const ownerIds = (svg: string): Set<string> =>
  new Set([...svg.matchAll(/data-sf-id="([^"]+)"/g)].map(match => match[1]));
const elementIds = (svg: string): Set<string> =>
  new Set([...svg.matchAll(/\bid="(sf-[^"]+)"/g)].map(match => match[1]));

const rendered = (source: string): string => {
  const { svg, diagnostics } = render(source);
  expect(diagnostics).toEqual([]);
  return svg;
};

const MIDDLE_ENTITY = `  Entity middle : Box {
    kind: process
    text: "Middle"
    layout {
      position: 100, 200
      size: 160, 70
    }
  }

`;

describe('scene-diff id stability (patchSceneNodes contract)', () => {
  it('a text edit changes the SVG but not one id or owner-id', () => {
    const before = rendered(SFL_SAMPLE);
    const after = rendered(SFL_SAMPLE.replace('text: "Start"', 'text: "Begin"'));

    expect([...ownerIds(before)].sort()).toEqual(['finish', 'go', 'start']);
    expect(elementIds(before).size).toBeGreaterThanOrEqual(3);

    expect(after).not.toBe(before);
    expect(ownerIds(after)).toEqual(ownerIds(before));
    expect(elementIds(after)).toEqual(elementIds(before));
  });

  it('a layout move changes the SVG but not one id or owner-id', () => {
    const before = rendered(SFL_SAMPLE);
    const after = rendered(SFL_SAMPLE.replace('position: 100, 100', 'position: 400, 160'));

    expect(after).not.toBe(before);
    expect(ownerIds(after)).toEqual(ownerIds(before));
    expect(elementIds(after)).toEqual(elementIds(before));
  });

  it('adding an entity introduces exactly its owner-id and keeps every existing one', () => {
    const before = rendered(SFL_SAMPLE);
    const after = rendered(SFL_SAMPLE.replace('  Link go : Flow {', `${MIDDLE_ENTITY}  Link go : Flow {`));

    const introduced = [...ownerIds(after)].filter(id => !ownerIds(before).has(id));
    expect(introduced).toEqual(['middle']);
    for (const id of ownerIds(before)) {
      expect(ownerIds(after).has(id)).toBe(true);
    }
  });
});
