import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../src/index';
import type { SceneDiffEvent } from '../src/runtime/viewer';
import { createViewer } from '../src/runtime/viewer';

let animateSpy: ReturnType<typeof vi.fn>;

function setReducedMotion(reduce: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: reduce,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  vi.useFakeTimers();
  (SVGElement.prototype as unknown as { getBBox: () => DOMRect }).getBBox = () =>
    ({ x: 0, y: 0, width: 100, height: 50 }) as DOMRect;
  animateSpy = vi.fn(() => ({ cancel: () => undefined, finished: Promise.resolve() }));
  (Element.prototype as unknown as { animate: unknown }).animate = animateSpy;
  const globals = globalThis as unknown as { CSS?: { escape(value: string): string } };
  if (!globals.CSS?.escape) {
    globals.CSS = { escape: value => String(value).replace(/[^\w-]/g, ch => `\\${ch}`) };
  }
  setReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

const SFL = `sfl 1.2

Style Box { shape: rounded_rectangle; fill: "#e0f2fe"; stroke: "#0369a1" }
Style Flow { route: orthogonal; stroke: "#0369a1"; markerEnd: arrow }

Model M {
  Entity a : Box { kind: process; text: "A"; layout { position: 0, 0; size: 120, 60 } }
  Entity b : Box { kind: process; text: "B"; layout { position: 0, 200; size: 120, 60 } }
  Link e : Flow { from: a, bottom (0.5); to: b, top (0.5) }
}
`;

const SFL_ALT = SFL.replace('text: "A"', 'text: "A2"')
  .replace(
    '  Entity b : Box',
    '  Entity c : Box { kind: process; text: "C"; layout { position: 220, 0; size: 120, 60 } }\n  Entity b : Box',
  )
  .replace(
    '  Link e : Flow { from: a, bottom (0.5); to: b, top (0.5) }',
    '  Link e : Flow { from: a, bottom (0.5); to: b, top (0.5) }\n  Link f : Flow { from: a, right (0.5); to: c, left (0.5) }',
  );

function mount() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const viewer = createViewer({ container, source: SFL, interactive: true, diagramId: 'd' });
  const diffs: SceneDiffEvent[] = [];
  viewer.on('sceneDiff', event => diffs.push(event));
  return { viewer, svg: viewer.svg, diffs };
}

const overlayGroups = (svg: SVGSVGElement): SVGGElement[] =>
  Array.from(svg.querySelectorAll('[data-sf-change-overlay]')) as SVGGElement[];
const overlayOwners = (svg: SVGSVGElement): string[] =>
  overlayGroups(svg)
    .map(group => group.getAttribute('data-sf-change-overlay') ?? '')
    .sort();
const strokeOf = (group: SVGGElement): string | null => group.firstElementChild?.getAttribute('stroke') ?? null;

describe('change-highlighting: sceneDiff event', () => {
  it('fires on every update() with added/removed/changed at owner granularity, flag or no flag', () => {
    const { viewer, diffs } = mount();
    viewer.update({ source: SFL_ALT });

    expect(diffs).toHaveLength(1);
    expect(diffs[0].diagramId).toBe('d');
    expect([...diffs[0].added].sort()).toEqual(['c', 'f']);
    expect(diffs[0].changed).toEqual(['a']);
    expect(diffs[0].removed).toEqual([]);

    viewer.update({ source: SFL });
    expect([...diffs[1].removed].sort()).toEqual(['c', 'f']);
    expect(diffs[1].changed).toEqual(['a']);
    expect(diffs[1].added).toEqual([]);
  });

  it('paints no overlay when highlightChanges is omitted', () => {
    const { viewer, svg } = mount();
    viewer.update({ source: SFL_ALT });
    expect(overlayGroups(svg)).toHaveLength(0);
  });
});

describe('change-highlighting: highlightChanges flash', () => {
  it('flashes an overlay per added/changed owner — a <rect> for shapes, a <path> for links', () => {
    const { viewer, svg } = mount();
    viewer.update({ source: SFL_ALT, highlightChanges: true });

    expect(overlayOwners(svg)).toEqual(['a', 'c', 'f']);
    const link = svg.querySelector('[data-sf-change-overlay="f"]') as SVGGElement;
    const shape = svg.querySelector('[data-sf-change-overlay="a"]') as SVGGElement;
    expect(link.firstElementChild?.tagName.toLowerCase()).toBe('path');
    expect(shape.firstElementChild?.tagName.toLowerCase()).toBe('rect');
  });

  it('defaults to amber (#f59e0b)', () => {
    const { viewer, svg } = mount();
    viewer.update({ source: SFL_ALT, highlightChanges: true });
    for (const group of overlayGroups(svg)) {
      expect(strokeOf(group)).toBe('#f59e0b');
    }
  });

  it('honors a per-call { color } override', () => {
    const { viewer, svg } = mount();
    viewer.update({ source: SFL_ALT, highlightChanges: { color: '#2563eb' } });
    for (const group of overlayGroups(svg)) {
      expect(strokeOf(group)).toBe('#2563eb');
    }
  });

  it('removes the overlay after the fade duration (~1300ms) and animates it', () => {
    const { viewer, svg } = mount();
    viewer.update({ source: SFL_ALT, highlightChanges: true });

    expect(animateSpy).toHaveBeenCalled();
    vi.advanceTimersByTime(1299);
    expect(overlayGroups(svg).length).toBeGreaterThan(0);
    vi.advanceTimersByTime(1);
    expect(overlayGroups(svg)).toHaveLength(0);
  });
});

describe('change-highlighting: prefers-reduced-motion', () => {
  it('skips the animation and clears the ring after the shorter (~400ms) hold', () => {
    setReducedMotion(true);
    const { viewer, svg } = mount();
    viewer.update({ source: SFL_ALT, highlightChanges: true });

    expect(overlayGroups(svg).length).toBeGreaterThan(0);
    expect(animateSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(399);
    expect(overlayGroups(svg).length).toBeGreaterThan(0);
    vi.advanceTimersByTime(1);
    expect(overlayGroups(svg)).toHaveLength(0);
  });
});

describe('change-highlighting: render sanity', () => {
  it('the fixture SFL renders clean (guards against a vacuous suite)', () => {
    expect(render(SFL).diagnostics).toEqual([]);
    expect(render(SFL_ALT).diagnostics).toEqual([]);
  });
});
