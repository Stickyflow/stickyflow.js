import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState } from '../src/index';

// Maps §3.3: choropleth region value (Path.value) and base-layer image
// (shapeType 'image'), mirroring stickyflow-atlas's implementation.

describe('Path.value (choropleth region)', () => {
  const SFL = `sfl 1.2

Model board {
  Path region_a {
    points: [[0, 0], [100, 0], [100, 100], [0, 100]]
    closed: true
    value: 42.5
    style { fill: "#fee2e2" }
  }
}`;

  it('parses value off a closed Path', () => {
    const state = sflToCanvasState(SFL);
    expect(state.entities[0].path?.value).toBe(42.5);
  });

  it('leaves value undefined when never mentioned', () => {
    const withoutValue = SFL.replace('    value: 42.5\n', '');
    const state = sflToCanvasState(withoutValue);
    expect(state.entities[0].path?.value).toBeUndefined();
  });
});

describe('shape: image (base-layer image)', () => {
  const SFL = `sfl 1.2

Model board {
  Entity floor_plan {
    shape: image
    src: "/static/board-images/abc123.webp"
    layout { position: 0, 0; size: 800, 600 }
    style { fit: contain; stroke: "#000000"; strokeWidth: 2 }
  }
}`;

  it('parses src as a direct property and fit from style', () => {
    const state = sflToCanvasState(SFL);
    const entity = state.entities[0];
    expect(entity.shapeType).toBe('image');
    expect(entity.props.src).toBe('/static/board-images/abc123.webp');
    expect(entity.props.fit).toBe('contain');
  });

  it('renders an <image> element with preserveAspectRatio derived from fit, plus a border rect', () => {
    const { svg } = render(SFL);
    expect(svg).toContain('<image');
    expect(svg).toContain('href="/static/board-images/abc123.webp"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"'); // contain
    expect(svg).toContain('sf-shape-floor_plan-border');
  });

  it('defaults to cover (xMidYMid slice) when fit is unset', () => {
    const withoutFit = SFL.replace('fit: contain; ', '');
    const { svg } = render(withoutFit);
    expect(svg).toContain('preserveAspectRatio="xMidYMid slice"');
  });

  it('renders nothing for an image shape with no src (no placeholder noise in a static render)', () => {
    const withoutSrc = SFL.replace('    src: "/static/board-images/abc123.webp"\n', '');
    const { svg } = render(withoutSrc);
    expect(svg).not.toContain('<image');
  });
});
