import { describe, expect, it } from 'vitest';
import {
  buildBindingGraph,
  createBindingRuntime,
  createDataSource,
  defineComponent,
  parse,
  type RenderNode,
  render,
} from '../src/index';

const model = (body: string, data = '') => `sfl 1.4
${data}
Model m {
${body}
}
`;

const settings = `
DataSource settings {
  mode: record
  fields {
    wifi: boolean
    changes: number
  }
}
`;

const sw = (extra = '', kind = 'switch') => `  Component wifi {
    type: ${kind}
    ${extra}
    layout {
      position: 10, 10
      size: 52, 30
    }
  }`;

const nodesOf = (svg: string, id: string) => svg.match(new RegExp(`id="[^"]*widget-${id}[^"]*"`, 'g')) ?? [];

describe('built-in controls', () => {
  it('draws the switch thumb at the other end when the value changes', () => {
    const off = render(model(sw('value: false')));
    const on = render(model(sw('value: true')));
    const thumb = (result: ReturnType<typeof render>) =>
      result.scene.nodes.find(node => node.id === 'widget-wifi-thumb');
    expect(thumb(off)?.type).toBe('ellipse');
    expect((thumb(on) as Extract<RenderNode, { type: 'ellipse' }>).cx).toBeGreaterThan(
      (thumb(off) as Extract<RenderNode, { type: 'ellipse' }>).cx,
    );
    expect(off.diagnostics).toEqual([]);
  });

  it('draws a label above the face it sits on', () => {
    const label = (kind: string, value: string) => {
      const nodes = render(
        model(
          sw(
            `label: "Go"
    value: ${value}`,
            kind,
          ),
        ),
      ).scene.nodes;
      const text = nodes.find(node => node.id === 'widget-wifi-label');
      const face = nodes.find(node => node.id === 'widget-wifi-face');
      return { text: text?.order ?? 0, face: face?.order ?? 0 };
    };
    for (const [kind, value] of [
      ['button', 'false'],
      ['toggleButton', 'true'],
      ['toggleButton', 'false'],
    ]) {
      const { text, face } = label(kind, value);
      expect(text).toBeGreaterThan(face);
    }
  });

  it('takes colors from the block and falls back to the defaults for a bad value', () => {
    const styled = render(model(sw('value: true\n    accent: "#ff0000"')));
    const track = styled.scene.nodes.find(node => node.id === 'widget-wifi-track');
    expect(JSON.stringify(track)).toContain('#ff0000');
    const broken = render(model(sw('value: true\n    accent: "not a color!"')));
    expect(JSON.stringify(broken.scene.nodes.find(node => node.id === 'widget-wifi-track'))).toContain('#5a6bff');
  });

  it('limits a number property to what the type allows', () => {
    const label = (size: string) =>
      render(model(sw(`label: "Wi-Fi"\n    fontSize: ${size}`, 'checkbox'))).scene.nodes.find(
        node => node.id === 'widget-wifi-label',
      ) as Extract<RenderNode, { type: 'text' }>;
    expect(label('500').fontSize).toBe(200);
    expect(label('2').fontSize).toBe(6);
    expect(label('"abc"').fontSize).toBe(14);
  });

  it('dims a disabled control', () => {
    const result = render(model(sw('value: true\n    disabled: true')));
    const track = result.scene.nodes.find(node => node.id === 'widget-wifi-track') as Extract<
      RenderNode,
      { type: 'rect' }
    >;
    expect(track.style.opacity).toBe(0.4);
  });

  it('marks the whole control as one selectable object', () => {
    const result = render(model(sw('value: true')));
    const owned = result.scene.nodes.filter(node => node.identity?.id === 'wifi');
    expect(owned.length).toBeGreaterThan(1);
    expect(owned.filter(node => node.identity?.primary).map(node => node.id)).toEqual(['widget-wifi']);
    expect(nodesOf(result.svg, 'wifi').length).toBeGreaterThan(1);
  });

  it('draws a placeholder and reports a type that does not exist', () => {
    const result = render(model(sw('', 'carousel')));
    expect(result.scene.nodes.some(node => node.id === 'widget-wifi' && node.type === 'rect')).toBe(true);
    expect(result.scene.nodes.some(node => node.id === 'widget-wifi-label')).toBe(true);
  });
});

describe('defineComponent', () => {
  const definition = {
    type: 'dot',
    group: 'readout' as const,
    properties: { fill: { type: 'color' as const, default: '#00aa00' } },
    interaction: 'none' as const,
    pointerScale: false,
    size: { width: 20, height: 20 },
    scene: (
      component: { id: string; x: number; y: number; properties: Record<string, unknown> },
      { order }: { order: number },
    ): RenderNode[] => [
      {
        id: `widget-${component.id}`,
        type: 'ellipse',
        order,
        bounds: { minX: component.x, minY: component.y, maxX: component.x + 20, maxY: component.y + 20 },
        cx: component.x + 10,
        cy: component.y + 10,
        rx: 10,
        ry: 10,
        style: { fill: { kind: 'solid', color: String(component.properties.fill) } },
      },
    ],
  };

  it('adds a component that renders, and removes it again', () => {
    const source = model(sw('', 'dot'));
    const before = render(source);
    expect(before.scene.nodes.some(node => node.id === 'widget-wifi-label')).toBe(true);

    const remove = defineComponent(definition);
    const during = render(source);
    expect(JSON.stringify(during.scene.nodes.find(node => node.id === 'widget-wifi'))).toContain('#00aa00');
    expect(during.diagnostics).toEqual([]);

    remove();
    expect(render(source).scene.nodes.some(node => node.id === 'widget-wifi-label')).toBe(true);
  });

  it('refuses a second component of the same type and a bad type name', () => {
    const remove = defineComponent(definition);
    expect(() => defineComponent(definition)).toThrow(/already defined/);
    remove();
    expect(() => defineComponent({ ...definition, type: 'not a name' })).toThrow(/not a valid component type/);
    expect(() => defineComponent({ ...definition, type: 'switch' })).toThrow(/already defined/);
  });
});

describe('component values in the binding runtime', () => {
  const twoWay = model(
    `${sw('value: <-> settings.wifi\n    onChange: settings.changes <- settings.changes + 1')}
  Text status {
    text: <- when(wifi.value, "ON", "OFF")
    layout {
      position: 10, 50
      size: 60, 20
    }
  }`,
    settings,
  );

  const start = (source: string, wifi = false) => {
    const runtime = createBindingRuntime(source);
    const data = createDataSource({ wifi, changes: 0 });
    runtime.registerSource('settings', data);
    runtime.flush();
    return { runtime, data };
  };

  it('has no problems in a well formed two-way document', () => {
    expect(buildBindingGraph(parse(twoWay)).diagnostics).toEqual([]);
  });

  it('turns a switch on a tap and writes the field, then runs onChange', () => {
    const { runtime, data } = start(twoWay);
    runtime.release('wifi', true);
    expect(data.get()).toEqual({ wifi: true, changes: 1 });
    expect(runtime.flush()?.svg ?? '').toContain('ON');
  });

  it('follows the field when it changes elsewhere, without firing onChange', () => {
    const { runtime, data } = start(twoWay);
    data.set({ wifi: true, changes: 0 });
    const result = runtime.flush();
    expect(result?.svg).toContain('ON');
    expect(data.get()).toEqual({ wifi: true, changes: 0 });
  });

  it('turns it back off on a second tap and on the keyboard activation', () => {
    const { runtime, data } = start(twoWay, true);
    runtime.release('wifi', true);
    expect((data.get() as { wifi: boolean }).wifi).toBe(false);
    runtime.activate('wifi');
    expect((data.get() as { wifi: boolean }).wifi).toBe(true);
    expect((data.get() as { changes: number }).changes).toBe(2);
  });

  it('does not toggle on a press that is not a tap', () => {
    const { runtime, data } = start(twoWay);
    runtime.press('wifi');
    runtime.release('wifi', false);
    expect((data.get() as { wifi: boolean }).wifi).toBe(false);
  });

  it('ignores a disabled control', () => {
    const { runtime, data } = start(model(sw('value: <-> settings.wifi\n    disabled: true'), settings));
    runtime.release('wifi', true);
    runtime.activate('wifi');
    expect(runtime.change('wifi', true)).toBe(false);
    expect((data.get() as { wifi: boolean }).wifi).toBe(false);
  });

  it('keeps its own value when it is not bound, and rejects a value of the wrong type', () => {
    const { runtime } = start(model(sw('value: false'), settings));
    expect(runtime.change('wifi', 'yes' as unknown as boolean)).toBe(false);
    expect(runtime.change('wifi', true)).toBe(true);
    const nodes = runtime.flush()?.scene.nodes ?? [];
    const thumb = nodes.find(node => node.id === 'widget-wifi-thumb') as Extract<RenderNode, { type: 'ellipse' }>;
    expect(thumb.cx).toBeGreaterThan(30);
  });

  it('does not let the user change a value that is bound one way', () => {
    const { runtime, data } = start(model(sw('value: <- settings.wifi'), settings));
    expect(runtime.change('wifi', true)).toBe(false);
    runtime.release('wifi', true);
    expect((data.get() as { wifi: boolean }).wifi).toBe(false);
  });

  it('runs a handler on the tap of a button, which has no value', () => {
    const button = model(
      `  Component go {
    type: button
    label: "Go"
    onTap: settings.changes <- settings.changes + 1
    layout {
      position: 10, 10
      size: 80, 30
    }
  }`,
      settings,
    );
    const { runtime, data } = start(button);
    runtime.release('go', true);
    runtime.activate('go');
    expect((data.get() as { changes: number }).changes).toBe(2);
  });
});

describe('component bindings that cannot work', () => {
  const codes = (source: string) => buildBindingGraph(parse(source)).diagnostics.map(diagnostic => diagnostic.code);

  it('says that onChange belongs to a component the user can change', () => {
    const readout = model(
      `  Component n {
    type: rollingNumber
    onChange: settings.changes <- 1
  }`,
      settings,
    );
    expect(codes(readout)).toEqual(['unknown-event']);
  });

  it('checks the type of a bound value against the component', () => {
    const wrong = model(sw('value: <- settings.changes'), settings);
    expect(codes(wrong)).toEqual(['type-mismatch']);
  });

  it('accepts the two-way operator only on a field of a record source', () => {
    expect(codes(model(sw('value: <-> settings.nothing'), settings))).toEqual(['two-way-target']);
    expect(codes(model(sw('value: <-> 1 + 1'), settings))).toEqual(['two-way-target']);
    expect(codes(model(sw('label: <-> settings.wifi'), settings))).toEqual(['binding-operator-unsupported']);
  });

  it('knows the state of a component in an expression', () => {
    const state = model(
      `${sw()}
  Text t {
    text: <- when(wifi.focused, "F", "-")
    layout {
      position: 0, 0
      size: 10, 10
    }
  }
  Text u {
    text: <- when(wifi.value, "1", "0")
    layout {
      position: 0, 0
      size: 10, 10
    }
  }`,
      settings,
    );
    expect(codes(state)).toEqual([]);
  });
});
