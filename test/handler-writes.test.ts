import { describe, expect, it } from 'vitest';
import { createBindingRuntime } from '../src/index';

type Row = Record<string, unknown>;
type Runtime = ReturnType<typeof createBindingRuntime>;

const TWO_FIELDS = '      device.offset <- device.offset + 1\n      device.gain <- 2';
const TWICE = '      device.offset <- device.offset + 1\n      device.offset <- device.offset + 1';

const document = (handler: string) => `sfl 1.12

DataSource device {
  mode: record
  fields {
    offset: float
    gain: float
  }
}

Model m {
  Shape button {
    text: "Calibrate"
    layout { position: 0, 0; size: 100, 40 }
    onTap {
${handler}
    }
  }
}
`;

function tapTwice(runtime: Runtime): void {
  for (let tap = 0; tap < 2; tap++) {
    runtime.press('button');
    runtime.release('button', true);
    runtime.flush();
  }
}

// A host that takes the values over at once and tells its listeners, by write or by set.
function takingHost(method: 'write' | 'set', calls: Row[]) {
  let row: Row = { offset: 0, gain: 1 };
  const listeners = new Set<() => void>();
  return {
    get: () => row,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    [method]: (next: Row) => {
      calls.push(next);
      row = method === 'set' ? next : { ...row, ...next };
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

function run(handler: string, source: object | null): Runtime {
  const runtime = createBindingRuntime(document(handler));
  if (source) {
    runtime.registerSource('device', source as never);
  }
  runtime.flush();
  tapTwice(runtime);
  return runtime;
}

const codes = (runtime: Runtime) => runtime.diagnostics.map(diagnostic => diagnostic.code);

describe('a handler that writes into a source the host registered', () => {
  it('warns once when the source can only be read', () => {
    const source = { get: () => ({ offset: 0, gain: 1 }), subscribe: () => () => undefined };
    const runtime = run(TWO_FIELDS, source);
    expect(source.get()).toEqual({ offset: 0, gain: 1 });
    expect(codes(runtime)).toEqual(['source-not-writable']);
  });

  it('gives set the whole record once per handler', () => {
    const calls: Row[] = [];
    const source = takingHost('set', calls);
    const runtime = run(TWO_FIELDS, source);
    expect(calls).toEqual([
      { offset: 1, gain: 2 },
      { offset: 2, gain: 2 },
    ]);
    expect(source.get()).toEqual({ offset: 2, gain: 2 });
    expect(codes(runtime)).toEqual([]);
  });

  it('gives write only the fields that changed, all of one handler in one call', () => {
    const calls: Row[] = [];
    const source = takingHost('write', calls);
    run(TWO_FIELDS, source);
    expect(calls).toEqual([{ offset: 1, gain: 2 }, { offset: 2 }]);
    expect(source.get()).toEqual({ offset: 2, gain: 2 });
  });

  it('sends all fields of one handler together to a host that takes them over only later', () => {
    const calls: Row[] = [];
    const source = {
      get: () => ({ offset: 0, gain: 1 }),
      subscribe: () => () => undefined,
      write: (fields: Row) => calls.push(fields),
    };
    run(TWO_FIELDS, source);
    expect(calls).toEqual([
      { offset: 1, gain: 2 },
      { offset: 1, gain: 2 },
    ]);
  });

  it('warns once when the source is not registered', () => {
    const runtime = run(TWO_FIELDS, null);
    expect(codes(runtime)).toEqual(['source-not-registered']);
  });

  it('reads every right side from before the handler, so x <- x + 1 twice adds one', () => {
    const calls: Row[] = [];
    const source = takingHost('write', calls);
    run(TWICE, source);
    expect(calls).toEqual([{ offset: 1 }, { offset: 2 }]);
  });
});
