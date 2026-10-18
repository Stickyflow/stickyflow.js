import { describe, expect, it } from 'vitest';
import { createBindingRuntime, createDataSource } from '../src/binding';
import { render } from '../src/render';
import { applyPropertyChange, insertCanvasObject } from '../src/runtime/interaction';
import { canonicalize } from '../src/sflLanguage';

const sfl = `sfl 1.4

DataSource car {
  mode: record
  fields {
    speed: int
  }
}

Model board {
  Text label {
    text: <- "Speed " + car.speed
    layout {
      position: 10, 10
      size: 120, 24
    }
    style {
      fontSize: 18
      fontWeight: 200
      letterSpacing: 3
      textColor: "#ffffff"
    }
  }
}
`;

describe('Text block', () => {
  it('draws bare text with the font settings and no fill, stroke or padding', () => {
    const { svg } = render(sfl.replace('<- "Speed " + car.speed', '"50"'));
    expect(svg).toContain('font-weight="200"');
    expect(svg).toContain('letter-spacing="3"');
    expect(svg).toContain('font-size="18px"');
    expect(svg).toContain('fill="none" stroke="none"');
  });

  it('round-trips and follows a binding like a Shape text', () => {
    const text = canonicalize(sfl);
    expect(text).toContain('Text label {');
    expect(canonicalize(text)).toBe(text);

    const runtime = createBindingRuntime(sfl);
    const car = createDataSource({ speed: 42 });
    runtime.registerSource('car', car);
    runtime.flush();
    expect(runtime.input.shapes.find(shape => shape.id === 'label')?.text).toBe('Speed 42');
    car.set({ speed: 80 });
    runtime.flush();
    expect(runtime.input.shapes.find(shape => shape.id === 'label')?.text).toBe('Speed 80');
  });
});

describe('Text block editing', () => {
  it('edits a style property and inserts new Text blocks', () => {
    const edited = applyPropertyChange(sfl, {
      owner: { role: 'shape', id: 'label' },
      path: 'style.fontSize',
      value: 30,
    });
    expect(edited).toContain('fontSize: 30');
    const inserted = insertCanvasObject(sfl, {
      id: 'caption',
      kind: 'text',
      text: 'Hi',
      x: 0,
      y: 0,
      width: 100,
      height: 30,
    });
    expect(inserted).toContain('Text caption {');
  });
});

describe('tickScale widget', () => {
  const dial = `sfl 1.4

Model board {
  Widget scale {
    type: tickScale
    value: 40
    max: 100
    layout {
      position: 0, 0
      size: 200, 200
    }
    style {
      ticks: 40
      accent: "#ffffff"
    }
  }
}
`;

  it('renders as a tick scale surface lit up to value / max', () => {
    const { svg } = render(dial);
    expect(svg).toContain('data-sf-shader="tickScale"');
    expect(svg).toContain('&quot;progress&quot;:0.4');
    expect(svg).toContain('&quot;ticks&quot;:40');
  });

  it('follows a bound value', () => {
    const runtime = createBindingRuntime(
      dial
        .replace('value: 40', 'value: <- car.speed')
        .replace('Model board', 'DataSource car {\n  mode: record\n  fields {\n    speed: int\n  }\n}\n\nModel board'),
    );
    runtime.registerSource('car', createDataSource({ speed: 70 }));
    const live: Array<[string, string | number]> = [];
    runtime.attach({ update: () => undefined, setComponentValue: (id, value) => live.push([id, value]) });
    runtime.flush();
    expect(live).toContainEqual(['scale', 70]);
  });
});

describe('tickScale labels and shader editing', () => {
  const dial = `sfl 1.4

Shader Glow {
  program: halo
  intensity: 1
}

Style Face {
  shape: circle
  shader: Glow
}

Model board {
  Shape orb : Face {
    layout {
      position: 0, 0
      size: 100, 100
    }
  }

  Widget scale {
    type: tickScale
    value: 40
    max: 100
    layout {
      position: 0, 0
      size: 400, 400
    }
    style {
      ticks: 50
      major: 10
      labels: true
      labelSize: 14
    }
  }
}
`;

  it('writes one number per major tick next to the ring', () => {
    const { svg } = render(dial);
    for (const label of ['0', '20', '60', '100']) {
      expect(svg).toContain(`>${label}</tspan>`);
    }
    expect(svg).toContain('font-size="14px"');
  });

  it('edits a parameter of a Shader block', () => {
    const edited = applyPropertyChange(dial, { owner: { role: 'shape', id: 'Glow' }, path: 'intensity', value: 0.4 });
    expect(edited).toContain('intensity: 0.4');
  });
});
