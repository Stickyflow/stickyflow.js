import { describe, expect, it } from 'vitest';
import { type RenderNode, render } from '../src/index';

const clock = (hand: string, value = 15) => `sfl 1.6

Model m {
  Component minute {
    type: hand
    value: ${value}
    ${hand}
    layout {
      position: 0, 0
      size: 200, 200
    }
  }
}
`;

type PathNode = Extract<RenderNode, { type: 'path' }>;
const handOf = (source: string) =>
  render(source).scene.nodes.find(node => node.id === 'widget-minute-hand') as PathNode | undefined;

describe('the hand component', () => {
  it('turns clockwise from the top as far as the value is of max', () => {
    expect(handOf(clock('max: 60', 15))?.rotation).toBe(90);
    expect(handOf(clock('max: 60', 30))?.rotation).toBe(180);
    expect(handOf(clock('max: 12', 3))?.rotation).toBe(90);
  });

  it('turns about the middle of its box, and start moves the zero', () => {
    const node = handOf(clock('start: 30', 0));
    expect(node?.rotationCenter).toEqual({ x: 100, y: 100 });
    expect(node?.rotation).toBe(30);
  });

  it('is as long as its share of the radius, and the tail reaches behind the pivot', () => {
    const plain = handOf(clock('length: 0.5'));
    expect(plain?.d).toContain('L97 100');
    expect(plain?.d.startsWith('M97 100')).toBe(true);
    const tailed = handOf(clock('length: 0.5\n    tail: 0.2'));
    expect(tailed?.d.startsWith('M97 120')).toBe(true);
  });

  it('does not reach the pivot when there is a gap, and keeps both ends round', () => {
    const floating = handOf(clock('length: 0.8\n    gap: 0.3'));
    expect(floating?.d.startsWith('M97 70')).toBe(true);
    expect(floating?.d.match(/A/g)).toHaveLength(2);
  });

  it('draws a ring cap on the pivot only when the hub is set', () => {
    const ids = (hand: string) => render(clock(hand)).scene.nodes.map(node => node.id);
    expect(ids('hub: 0')).not.toContain('widget-minute-hub');
    expect(ids('hub: 6\n    hubRing: 2')).toContain('widget-minute-hub');
  });

  it('fades from the root to the tip with a gradient, and glows with a shadow', () => {
    const node = handOf(clock('color: "#ff8800"\n    fade: 1\n    glow: 12'));
    expect(node?.style.fill).toMatchObject({
      kind: 'linear-gradient',
      stops: [
        { offset: 0, color: 'rgba(255, 136, 0, 0)' },
        { offset: 100, color: '#ff8800' },
      ],
    });
    expect(node?.style.shadow).toMatchObject({ blur: 12, color: '#ff8800' });
  });

  it('dissolves towards the tip when tipFade is set', () => {
    const node = handOf(clock('color: "#ffffff"\n    tipFade: 1'));
    expect(node?.style.fill).toMatchObject({
      kind: 'linear-gradient',
      stops: [
        { offset: 0, color: '#ffffff' },
        { offset: 100, color: 'rgba(255, 255, 255, 0)' },
      ],
    });
  });

  it('is lit at the pivot and dissolves at both ends when a tail reaches back', () => {
    const node = handOf(clock('color: "#ffffff"\n    tail: 0.25\n    length: 0.75\n    fade: 1\n    tipFade: 1'));
    const fill = node?.style.fill as { stops: Array<{ offset: number; color: string }> } | undefined;
    const stops = fill?.stops ?? [];
    expect(stops.map(stop => stop.offset)).toEqual([0, 25, 100]);
    expect(stops[1].color).toBe('#ffffff');
    expect(stops[0].color).toBe('rgba(255, 255, 255, 0)');
  });

  it('is a beam of three blurred layers when soft is set, and one crisp shape without it', () => {
    const ids = (hand: string) =>
      render(clock(hand))
        .scene.nodes.map(node => node.id)
        .filter(id => id.includes('-hand'));
    expect(ids('soft: 0')).toEqual(['widget-minute-hand']);
    expect(ids('soft: 4')).toEqual(['widget-minute-hand-light', 'widget-minute-hand-body', 'widget-minute-hand']);
    const layers = render(clock('soft: 4\n    width: 10')).scene.nodes.filter(node => node.id.includes('-hand'));
    const blur = layers.map(node => (node as PathNode).style.blur);
    expect(blur).toEqual([12, 4, 1.2]);
  });

  it('puts a blurred light under a crisp hand when bloom is set, and the light goes out at the tip', () => {
    const nodes = render(clock('bloom: 12\n    color: "#4a78ff"\n    glowColor: "#2f45ff"')).scene.nodes.filter(node =>
      node.id.includes('-hand'),
    ) as PathNode[];
    expect(nodes.map(node => node.id)).toEqual(['widget-minute-hand-bloom', 'widget-minute-hand']);
    expect(nodes[0].style.blur).toBe(12);
    expect(nodes[1].style.blur).toBeUndefined();
    const stops = (nodes[0].style.fill as { stops: Array<{ color: string }> }).stops;
    expect(stops[stops.length - 1].color).toBe('rgba(47, 69, 255, 0)');
  });

  it('switches its optional colors off with none', () => {
    expect(handOf(clock('glow: 12\n    glowColor: none'))?.style.shadow).toBeUndefined();
    expect(handOf(clock('glow: 12'))?.style.shadow).toBeDefined();
    const hub = render(clock('hub: 6\n    hubFill: none')).scene.nodes.find(node => node.id === 'widget-minute-hub') as
      | Extract<RenderNode, { type: 'ellipse' }>
      | undefined;
    expect(hub?.style.fill).toEqual({ kind: 'none' });
    const ids = render(clock('soft: 4\n    glowColor: none')).scene.nodes.map(node => node.id);
    expect(ids).not.toContain('widget-minute-hand-light');
    const clear = handOf(clock('color: "#ffffff"\n    root: none'))?.style.fill as { stops: Array<{ color: string }> };
    expect(clear.stops[0].color).toBe('rgba(255, 255, 255, 0)');
  });

  it('is picked along its own shape, and its box does not take the clicks of what lies behind', () => {
    const nodes = render(clock('width: 2')).scene.nodes as Array<RenderNode & { style?: { pointerEvents?: string } }>;
    expect(nodes.find(node => node.id === 'widget-minute')?.style?.pointerEvents).toBe('none');
    const pick = nodes.find(node => node.id === 'widget-minute-pick') as PathNode | undefined;
    expect(pick?.style.pointerEvents).toBe('all');
    expect(pick?.rotation).toBe(90);
    expect(pick?.d).toContain('L92 ');
  });

  it('draws in the svg without diagnostics', () => {
    const result = render(clock('glow: 8\n    fade: 0.5'));
    expect(result.diagnostics).toEqual([]);
    expect(result.svg).toContain('widget-minute-hand');
  });
});
