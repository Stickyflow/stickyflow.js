import { describe, expect, it } from 'vitest';
import type { RenderInput } from '../src/index';
import { render, renderCanvas, sflToRenderInput } from '../src/index';

const swimlane = (extra: string) => `sfl 1.2

Model M {
  Container process {
    kind: swimlane
    text: "Order process"
    orientation: horizontal
    lanes: [["Customer", 120], ["Warehouse", 120]]
${extra}
    layout {
      position: 0, 0
      size: 400, 240
    }
  }
}
`;

describe('Swimlane — SFL style properties', () => {
  it('maps SFL properties to the canonical camelCase swimlane contract', () => {
    expect(sflToRenderInput(swimlane('    cornerRadius: 24\n    showLaneLabels: false')).swimlanes[0]).toMatchObject({
      strokeColor: '#6b7280',
      strokeWidth: 2,
      cornerRadius: 24,
      fillColor: 'rgba(107, 114, 128, 0.05)',
      showLaneLabels: false,
    });
  });

  it('does not render a swimlane whose canonical visibility flag is false', () => {
    const hiddenSwimlane = { ...sflToRenderInput(swimlane('')).swimlanes[0], isVisible: false };
    const input = { shapes: [], frames: [], swimlanes: [hiddenSwimlane], links: [] } as RenderInput;

    expect(renderCanvas(input).svg).not.toContain('sf-swimlane-process');
  });

  it('defaults fill to the same tinted gray as a UI-created swimlane, not transparent', () => {
    const { svg } = render(swimlane(''));
    const rect = svg.match(/<rect id="[^"]*swimlane-process"[^>]*>/)?.[0];
    expect(rect).toContain('fill="rgba(107, 114, 128, 0.05)"');
  });

  it('lets an explicit fill override the default', () => {
    const { svg } = render(swimlane('    fill: "#f5f3ff"'));
    const rect = svg.match(/<rect id="[^"]*swimlane-process"[^>]*>/)?.[0];
    expect(rect).toContain('fill="#f5f3ff"');
  });

  it('rounds the swimlane rect corners with cornerRadius', () => {
    const { svg } = render(swimlane('    cornerRadius: 24'));
    const rect = svg.match(/<rect id="[^"]*swimlane-process"[^>]*>/)?.[0];
    expect(rect).toContain('rx="24"');
  });

  it('draws a dashed border with dash', () => {
    const { svg } = render(swimlane('    dash: "[8, 4]"'));
    const rect = svg.match(/<rect id="[^"]*swimlane-process"[^>]*>/)?.[0];
    expect(rect).toContain('stroke-dasharray="8 4"');
  });

  it('hides the per-lane labels with showLaneLabels: false', () => {
    const shown = render(swimlane('')).svg;
    expect(shown).toContain('>Customer</tspan>');

    const hidden = render(swimlane('    showLaneLabels: false')).svg;
    expect(hidden).not.toContain('>Customer</tspan>');
  });

  it('applies fontFamily to the per-lane labels', () => {
    const { svg } = render(swimlane('    fontFamily: "Georgia, serif"'));
    expect(svg).toContain('font-family="Georgia, serif"');
  });
});
