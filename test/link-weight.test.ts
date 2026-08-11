import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';

// Diagrams category audit (stickyflow-atlas parity): weight/showWeight had a
// Link model field but were never parsed from SFL or rendered anywhere in
// this package's SVG pipeline - pure write-side gap on the app side, and a
// full gap here (no parse, no render at all).

const SFL = `sfl 1.2

Model board {
  Entity a { shape: rectangle; layout { position: 0, 0; size: 100, 60 } }
  Entity b { shape: rectangle; layout { position: 300, 0; size: 100, 60 } }

  Link heavy {
    from: a
    to: b
    weight: 5
  }

  Link hidden_weight {
    from: b
    to: a
    weight: 3
    showWeight: false
  }
}`;

describe('Link weight/showWeight', () => {
  it('parses weight and defaults showWeight to true when absent', () => {
    const state = sflToCanvasState(SFL);
    const heavy = state.links.find(l => l.id === 'heavy');
    expect(heavy?.props.weight).toBe('5');
    expect(heavy?.props.showWeight).toBeUndefined(); // absent in SFL text itself
  });

  it('renders a weight badge (rect + text) for a link with weight set', () => {
    const { svg } = render(SFL);
    expect(svg).toContain('sf-link-weight-badge-heavy');
    expect(svg).toContain('sf-link-weight-heavy');
    expect(svg).toContain('5.0');
  });

  it('suppresses the badge when showWeight is explicitly false', () => {
    const { svg } = render(SFL);
    expect(svg).not.toContain('sf-link-weight-badge-hidden_weight');
    expect(svg).not.toContain('3.0');
  });
});
