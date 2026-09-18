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

  it('rounds the frame rect corners with cornerRadius', () => {
    const { svg } = render(frame('    cornerRadius: 24'));
    const rect = svg.match(/<rect id="[^"]*frame-f"[^>]*>/)?.[0];
    expect(rect).toContain('rx="24"');
  });

  it('draws a dashed border with dash', () => {
    const { svg } = render(frame('    dash: "[8, 4]"'));
    const rect = svg.match(/<rect id="[^"]*frame-f"[^>]*>/)?.[0];
    expect(rect).toContain('stroke-dasharray="8 4"');
  });

  it('applies fontFamily to the title tab text', () => {
    const { svg } = render(frame('    fontFamily: "Georgia, serif"'));
    const title = svg.match(/<text id="[^"]*frame-title-f"[^>]*>/)?.[0];
    expect(title).toContain('font-family="Georgia, serif"');
  });
});
