import { describe, expect, it } from 'vitest';
import { render } from '../src/index';

const frame = (extra: string) => `sfl 1.2

Model M {
  Container f {
    kind: frame
    text: "Checkout Flow"
    fill: "#f5f3ff"
    stroke: "#9b42df"
${extra}
    layout {
      position: 0, 0
      size: 300, 200
    }
  }
}
`;

describe('Frame — SFL style properties', () => {
  it('defaults the title tab text to white when textColor is unset', () => {
    const { svg } = render(frame(''));
    const title = svg.match(/<text id="[^"]*frame-title-f"[^>]*>/)?.[0];
    expect(title).toContain('fill="#ffffff"');
  });

  it('colors the title tab text with an explicit textColor', () => {
    const { svg } = render(frame('    textColor: "#111827"'));
    const title = svg.match(/<text id="[^"]*frame-title-f"[^>]*>/)?.[0];
    expect(title).toContain('fill="#111827"');
  });

  it('rounds the frame rect corners with cornerRadius when no title tab is shown', () => {
    const { svg } = render(frame('    cornerRadius: 24\n    showLabel: false'));
    const rect = svg.match(/<rect id="[^"]*frame-f"[^>]*>/)?.[0];
    expect(rect).toContain('rx="24"');
  });

  it('draws a dashed border with dash', () => {
    const { svg } = render(frame('    dash: "[8, 4]"\n    showLabel: false'));
    const rect = svg.match(/<rect id="[^"]*frame-f"[^>]*>/)?.[0];
    expect(rect).toContain('stroke-dasharray="8 4"');
  });

  it('applies fontFamily to the title tab text', () => {
    const { svg } = render(frame('    fontFamily: "Georgia, serif"'));
    const title = svg.match(/<text id="[^"]*frame-title-f"[^>]*>/)?.[0];
    expect(title).toContain('font-family="Georgia, serif"');
  });
});

describe('Frame — title tab position and shape', () => {
  it("sits flush with the frame's left edge by default (top), rounded on top only", () => {
    const { svg } = render(frame(''));
    const tab = svg.match(/<path id="[^"]*frame-tab-f"[^>]*>/)?.[0];
    expect(tab).toBeDefined();
    expect(tab).toMatch(/d="M 0 /);
    expect(tab).toContain('V 0 H 0 Z');
  });

  it('moves the tab below the frame with labelPosition: bottom, square top corners and rounded bottom corners', () => {
    const { svg } = render(frame('    labelPosition: bottom'));
    const tab = svg.match(/<path id="[^"]*frame-tab-f"[^>]*>/)?.[0];
    expect(tab).toMatch(/d="M 0 200 H [\d.]+ V/);
  });

  it('places the tab to the left of the frame with labelPosition: left, text rotated -90', () => {
    const { svg } = render(frame('    labelPosition: left'));
    const tab = svg.match(/<path id="[^"]*frame-tab-f"[^>]*>/)?.[0];
    const [, tabX] = tab?.match(/d="M ([\d.-]+) /) ?? [];
    expect(Number(tabX)).toBeLessThan(0);
    const title = svg.match(/<text id="[^"]*frame-title-f"[^>]*>/)?.[0];
    expect(title).toContain('rotate(-90');
  });

  it('places the tab to the right of the frame with labelPosition: right, text rotated -90', () => {
    const { svg } = render(frame('    labelPosition: right'));
    const tab = svg.match(/<path id="[^"]*frame-tab-f"[^>]*>/)?.[0];
    const [, tabX] = tab?.match(/d="M ([\d.-]+) /) ?? [];
    expect(Number(tabX)).toBeGreaterThanOrEqual(300);
    const title = svg.match(/<text id="[^"]*frame-title-f"[^>]*>/)?.[0];
    expect(title).toContain('rotate(-90');
  });

  it('draws a drop shadow on the tab by default, and lets shadow: false remove it', () => {
    const shown = render(frame('')).svg;
    expect(shown).toContain('filter="url(#sf-shadow-frame-tab-f-0)"');

    const hidden = render(frame('    shadow: false')).svg;
    expect(hidden).not.toContain('filter="url(#sf-shadow-frame-tab-f-0)"');
  });
});

describe('Frame — own boundary squares the corner the tab touches', () => {
  it('renders as a plain rect (uniform rx) when no title tab is shown', () => {
    const { svg } = render(frame('    showLabel: false'));
    const rect = svg.match(/<rect id="[^"]*frame-f"[^>]*>/)?.[0];
    expect(rect).toBeDefined();
    expect(svg).not.toMatch(/<path id="[^"]*frame-f"/);
  });

  it('squares the top-left corner for labelPosition: top (default)', () => {
    const { svg } = render(frame(''));
    const path = svg.match(/<path id="[^"]*frame-f"[^>]*>/)?.[0];
    expect(path).toMatch(/d="M 0 0 H 288 A 12 12 0 0 1 300 12/);
  });

  it('squares the bottom-left corner for labelPosition: bottom', () => {
    const { svg } = render(frame('    labelPosition: bottom'));
    const path = svg.match(/<path id="[^"]*frame-f"[^>]*>/)?.[0];
    expect(path).toMatch(/H 0 V 12 A 12 12 0 0 1 12 0 Z"/);
  });

  it('squares the top-left corner for labelPosition: left', () => {
    const { svg } = render(frame('    labelPosition: left'));
    const path = svg.match(/<path id="[^"]*frame-f"[^>]*>/)?.[0];
    expect(path).toMatch(/d="M 0 0 H 288 A 12 12 0 0 1 300 12/);
  });

  it('squares the top-right corner for labelPosition: right', () => {
    const { svg } = render(frame('    labelPosition: right'));
    const path = svg.match(/<path id="[^"]*frame-f"[^>]*>/)?.[0];
    expect(path).toMatch(/d="M 12 0 H 300 V 188/);
  });
});
