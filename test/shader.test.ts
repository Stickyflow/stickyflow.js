import { describe, expect, it } from 'vitest';
import { render, sflToCanvasState, sflToRenderInput } from '../src/index';

const SOURCE = `sfl 1.4

Shader VioletOrb {
  program: orb
  color: "#11052f"
  accent: "#9c6cff"
  intensity: 0.9
  speed: 0.12
}

Style ShaderCircle {
  shape: circle
  fill: "#11052f"
  shader: VioletOrb
}

Model board {
  Shape pulse : ShaderCircle {
    text: "87"
    layout { position: 20, 30; size: 240, 240 }
  }
}`;

describe('shape shaders', () => {
  it('resolves named Shader blocks and their parameters', () => {
    const state = sflToCanvasState(SOURCE);
    expect(state.shaders).toEqual([
      {
        name: 'VioletOrb',
        program: 'orb',
        parameters: {
          color: '#11052f',
          accent: '#9c6cff',
          intensity: 0.9,
          speed: 0.12,
        },
      },
    ]);

    expect(sflToRenderInput(SOURCE).shapes[0].shader?.name).toBe('VioletOrb');
  });

  it('emits a GPU surface above the SVG circle fallback', () => {
    const { svg, scene } = render(SOURCE);
    expect(scene.nodes.map(node => node.type)).toContain('shader-surface');
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('data-sf-shader="orb"');
    expect(svg).toContain('data-sf-shader-name="VioletOrb"');
    expect(svg).toContain('data-sf-shader-fill="#11052f"');
    expect(svg.indexOf('<ellipse')).toBeLessThan(svg.indexOf('<foreignObject'));
  });

  it('keeps the SVG fallback when a shader reference cannot be resolved', () => {
    const source = SOURCE.replace('shader: VioletOrb', 'shader: MissingShader');
    const { svg } = render(source);
    expect(svg).toContain('<ellipse');
    expect(svg).not.toContain('<foreignObject');
  });

  it('keeps directional and boolean shader controls as document parameters', () => {
    const source = SOURCE.replace(
      'speed: 0.12',
      `speed: 0.12
  direction: top
  reach: 0.6
  orientation: horizontal
  hole: false
  holeSize: 0.3`,
    );
    const [shader] = sflToCanvasState(source).shaders ?? [];
    expect(shader?.parameters).toMatchObject({
      direction: 'top',
      reach: 0.6,
      orientation: 'horizontal',
      hole: false,
      holeSize: 0.3,
    });
  });

  it('emits padded shader surfaces for reactive rectangular panels', () => {
    const source = `sfl 1.4

Shader NeonPanel {
  program: reactivePanel
  surfacePadding: 24
  cornerRadius: 18
  emission: 1
}

Style Panel {
  shape: rounded_rectangle
  fill: "#08101d"
  shader: NeonPanel
}

Model board {
  Shape tile : Panel {
    layout { position: 100, 80; size: 160, 100 }
  }
}`;

    const { svg, scene } = render(source);
    const [shader] = sflToCanvasState(source).shaders ?? [];
    const surface = scene.nodes.find(node => node.type === 'shader-surface');
    expect(shader).toMatchObject({
      surfacePadding: 24,
      parameters: {
        cornerRadius: 18,
        emission: 1,
      },
    });
    expect(shader?.parameters).not.toHaveProperty('surfacePadding');
    expect(surface).toMatchObject({
      type: 'shader-surface',
      x: 76,
      y: 56,
      width: 208,
      height: 148,
      mask: 'rect',
    });
    expect(svg).toContain('data-sf-shader="reactivePanel"');
    expect(svg).toContain('data-sf-shader-mask="rect"');
    expect(svg).toContain('data-sf-shader-padding="24"');
  });
});
