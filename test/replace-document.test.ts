import { describe, expect, it } from 'vitest';
import { createBindingRuntime } from '../src/index';

type Row = Record<string, unknown>;

const SOURCE = `DataSource device {
  mode: record
  fields {
    angle: float
    level: float
  }
}`;

const READS = `sfl 1.12

${SOURCE}

Model m {
  Text shown { text: <- "Angle " + round(device.angle); layout { position: 0, 0; size: 200, 30 } }
}
`;

const WRITES = `sfl 1.12

${SOURCE}

Model m {
  Text shown { text: <- "Angle " + round(device.angle); layout { position: 0, 0; size: 200, 30 } }
  Component level { type: slider; value: <-> device.level; min: 0; max: 10; layout { position: 0, 40; size: 200, 30 } }
}
`;

const WRITES_ANGLE = WRITES.replace('<-> device.level', '<-> device.angle');

const withParameters = (extra: string) => `sfl 1.12

Parameters knobs {
  width: 40
  ${extra}
}

Model m {
  Shape box { text: ""; layout { position: 0, 0; size: width, 30 } }
  Component width { type: slider; value: <-> knobs.width; min: 0; max: 200; layout { position: 0, 40; size: 200, 30 } }
}
`;

// A device as a host has it: it counts who listens and what is written to it.
function device(writable?: string[]) {
  let row: Row = { angle: 0, level: 1 };
  const listeners = new Set<() => void>();
  const written: Row[] = [];
  let subscriptions = 0;
  return {
    source: {
      writable,
      get: () => row,
      subscribe(listener: () => void) {
        subscriptions++;
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      write(fields: Row) {
        written.push(fields);
        row = { ...row, ...fields };
        for (const listener of listeners) {
          listener();
        }
      },
    },
    written,
    listening: () => listeners.size,
    subscriptions: () => subscriptions,
    report(fields: Row) {
      row = { ...row, ...fields };
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

function attached(runtime: ReturnType<typeof createBindingRuntime>) {
  const pictures: string[] = [];
  let cleared = 0;
  runtime.attach({ update: next => pictures.push(next.svg), clearOverrides: () => cleared++ });
  return { pictures, cleared: () => cleared };
}

describe('another document in place of the one that runs', () => {
  it('keeps the registered source and its one listener, and draws at once', () => {
    const host = device();
    const runtime = createBindingRuntime(READS);
    runtime.registerSource('device', host.source);
    const target = attached(runtime);
    host.report({ angle: 30 });
    runtime.flush();
    const before = target.pictures.length;

    const result = runtime.replace(WRITES);

    expect(result.ok).toBe(true);
    expect(result.writes).toEqual({ device: ['level'] });
    expect(host.subscriptions()).toBe(1);
    expect(host.listening()).toBe(1);
    expect(target.pictures.length).toBe(before + 1);
    expect(target.pictures.at(-1)).toContain('Angle 30');
    expect(target.cleared()).toBe(1);

    host.report({ angle: 45 });
    runtime.flush();
    expect(target.pictures.at(-1)).toContain('Angle 45');
    runtime.change('level', 7);
    expect(host.written).toEqual([{ level: 7 }]);
  });

  it('is not taken when it cannot be read, and the one that runs goes on', () => {
    const host = device();
    const runtime = createBindingRuntime(READS);
    runtime.registerSource('device', host.source);
    const target = attached(runtime);
    const before = target.pictures.length;

    const result = runtime.replace('sfl 1.12\n\nModel m {\n  Text t { text: \n');

    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].code).toBe('document-not-read');
    expect(target.pictures.length).toBe(before);
    host.report({ angle: 12 });
    runtime.flush();
    expect(target.pictures.at(-1)).toContain('Angle 12');
  });

  it('is not taken when it writes a field the host does not let it write', () => {
    const host = device(['level']);
    const runtime = createBindingRuntime(READS);
    runtime.registerSource('device', host.source);
    attached(runtime);

    expect(runtime.check(WRITES).ok).toBe(true);
    const result = runtime.replace(WRITES_ANGLE);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map(diagnostic => diagnostic.code)).toContain('write-not-allowed');
    expect(result.writes).toEqual({ device: ['angle'] });
    expect(runtime.diagnostics.filter(diagnostic => diagnostic.severity === 'error')).toEqual([]);
    expect(runtime.graph.elements.has('level')).toBe(false);
  });

  it('checks without touching the document that runs', () => {
    const host = device();
    const runtime = createBindingRuntime(READS);
    runtime.registerSource('device', host.source);
    const target = attached(runtime);
    const before = target.pictures.length;

    expect(runtime.check(WRITES)).toMatchObject({ ok: true, writes: { device: ['level'] } });
    expect(target.pictures.length).toBe(before);
    expect(runtime.graph.elements.has('level')).toBe(false);
  });

  it('keeps the value of a parameter that is still there under its name', () => {
    const runtime = createBindingRuntime(withParameters('depth: 5'));
    attached(runtime);
    runtime.change('width', 120);
    runtime.flush();

    const result = runtime.replace(withParameters('height: 9'));

    expect(result.ok).toBe(true);
    expect(result.writes).toEqual({});
    const box = runtime.input.shapes.find(shape => shape.id === 'box');
    expect(box?.width).toBe(120);
    runtime.change('width', 60);
    runtime.flush();
    expect(runtime.input.shapes.find(shape => shape.id === 'box')?.width).toBe(60);
  });

  it('does not grow with many replacements', () => {
    const host = device();
    const runtime = createBindingRuntime(READS);
    runtime.registerSource('device', host.source);
    const target = attached(runtime);
    for (let turn = 0; turn < 50; turn++) {
      host.report({ angle: turn });
      expect(runtime.replace(turn % 2 ? READS : WRITES).ok).toBe(true);
      expect(target.pictures.at(-1)).toContain(`Angle ${turn}`);
    }
    expect(host.subscriptions()).toBe(1);
    expect(host.listening()).toBe(1);
    expect(runtime.diagnostics).toEqual([]);
  });
});
