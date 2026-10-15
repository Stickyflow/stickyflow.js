import { type RenderOptions, type RenderResult, renderCanvas } from '../render';
import { sflToRenderInput } from '../renderInput/fromSfl';
import { parse } from '../sflLanguage';
import { APPLY, applyShader } from './applyValue';
import { checkData } from './checkData';
import type { DataSource, MutableDataSource } from './dataSource';
import { collectRefs, evaluate } from './expression';
import { buildBindingGraph } from './graph';
import { interactiveElements } from './interactive';
import type { BindingRuntime, BindingRuntimeOptions, ElementState, LiveChange } from './runtimeTypes';
import type { BindingValue, BoundHandler, BoundProperty, Row } from './types';
import { TICK_EVENT } from './types';

export function createBindingRuntime(sfl: string, options: BindingRuntimeOptions = {}): BindingRuntime {
  const graph = buildBindingGraph(parse(sfl));
  const diagnostics = [...graph.diagnostics];
  const input = structuredClone(sflToRenderInput(sfl));
  const sources = new Map<string, DataSource>();
  const applied = new Map<string, string>();
  const dirty = new Set<BoundProperty>();
  const listeners = new Set<(result: RenderResult) => void>();
  const warned = new Set<string>();
  const liveListeners = new Set<(change: LiveChange) => void>();
  const liveState = new Map<string, LiveChange>();
  let scheduled = false;

  const elementState = new Map<string, ElementState>();
  for (const name of graph.elements.keys()) {
    if (!graph.contracts.has(name)) {
      elementState.set(name, { pressed: false, hovered: false, pointer: 0 });
    }
  }

  const read = (path: string[]): BindingValue => {
    const [name, field] = path;
    const state = sources.has(name) ? undefined : elementState.get(name);
    if (state) {
      return state[field as keyof ElementState];
    }
    const data = sources.get(name)?.get();
    if (data === undefined) {
      throw new Error(`DataSource '${name}' has no data yet.`);
    }
    return Array.isArray(data)
      ? (data.map(row => row[field]) as BindingValue)
      : ((data as Record<string, unknown>)[field] as BindingValue);
  };

  const missingSource = (binding: BoundProperty): string | undefined =>
    binding.dependencies
      .map(dependency => dependency.split('.')[0])
      .find(name => !sources.has(name) && !elementState.has(name));

  const announce = (id: string, change: LiveChange) => {
    liveState.set(id, change);
    for (const listener of [...liveListeners]) {
      listener(change);
    }
  };

  const evaluateBinding = (binding: BoundProperty): boolean => {
    const missing = missingSource(binding);
    if (missing) {
      if (!warned.has(missing)) {
        warned.add(missing);
        diagnostics.push({
          severity: 'warning',
          code: 'source-not-registered',
          message: `DataSource '${missing}' has no registered source, so '${binding.property}' stays empty.`,
          line: binding.line,
          col: binding.col,
        });
      }
      return false;
    }
    const value = evaluate(binding.expr, { read });
    const key = JSON.stringify(value);
    if (applied.get(binding.id) === key) {
      return false;
    }
    applied.set(binding.id, key);
    if (binding.ownerKind === 'Shader') {
      announce(binding.id, {
        kind: 'shader',
        owners: applyShader(input, binding, value),
        parameters: { [binding.property]: value as number },
      });
      return false;
    }
    APPLY[`${binding.ownerKind === 'Text' ? 'Shape' : binding.ownerKind}.${binding.property}`]?.(
      input,
      binding.ownerPath,
      value,
    );
    if (binding.ownerKind === 'Widget') {
      announce(binding.id, { kind: 'widget', id: binding.ownerPath[0], value: value as number });
      return false;
    }
    return true;
  };

  const renderNow = (): RenderResult => renderCanvas(input, { ...options.renderOptions, linkHitAreas: true });

  const flush = (): RenderResult | null => {
    scheduled = false;
    let changed = false;
    for (const binding of dirty) {
      changed = evaluateBinding(binding) || changed;
    }
    dirty.clear();
    if (!changed) {
      return null;
    }
    const result = renderNow();
    for (const listener of [...listeners]) {
      listener(result);
    }
    return result;
  };

  const schedule = () => {
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
  };

  const markDirty = (name: string) => {
    for (const [field, bindings] of graph.byField) {
      if (field.startsWith(`${name}.`)) {
        for (const binding of bindings) {
          dirty.add(binding);
        }
      }
    }
  };

  const runHandler = (handler: BoundHandler, delta?: number) => {
    const env = { read: (path: string[]) => (path[0] === 'time' && path[1] === 'delta' ? (delta ?? 0) : read(path)) };
    for (const assignment of handler.assignments) {
      const target = sources.get(assignment.source);
      const readable = collectRefs(assignment.expr).every(
        ([name]) => name === 'time' || sources.has(name) || elementState.has(name),
      );
      if (!target || !('set' in target) || !readable) {
        continue;
      }
      let value = evaluate(assignment.expr, env);
      if (typeof value === 'number') {
        value =
          graph.contracts.get(assignment.source)?.declared[assignment.field] === 'int' ? Math.round(value) : value;
        if (!Number.isFinite(value)) {
          continue;
        }
      }
      const row = target.get() as Row;
      if (row[assignment.field] !== value) {
        (target as MutableDataSource).set({ ...row, [assignment.field]: value });
      }
    }
  };

  const dispatch = (id: string, event: string) => {
    for (const handler of graph.handlers) {
      if (handler.event === event && handler.ownerKind !== 'DataSource' && handler.ownerPath[0] === id) {
        runHandler(handler);
      }
    }
  };

  const setElementState = (id: string, patch: Partial<ElementState>) => {
    const state = elementState.get(id);
    if (!state || (Object.keys(patch) as Array<keyof ElementState>).every(key => state[key] === patch[key])) {
      return;
    }
    Object.assign(state, patch);
    markDirty(id);
    schedule();
  };

  for (const binding of graph.bindings) {
    if (binding.dependencies.length === 0) {
      dirty.add(binding);
    }
  }
  if (dirty.size > 0) {
    schedule();
  }

  return {
    diagnostics,
    graph,
    interactive: interactiveElements(graph),
    input,
    registerSource(name, source) {
      const contract = graph.contracts.get(name);
      if (!contract) {
        throw new Error(`No DataSource '${name}' is declared in the SFL.`);
      }
      const accept = (): boolean => {
        const problem = checkData(contract, source.get());
        if (problem) {
          diagnostics.push({ severity: 'error', code: 'data-type-mismatch', message: problem, line: 0, col: 0 });
          return false;
        }
        return true;
      };
      const adopt = () => {
        if (accept()) {
          sources.set(name, source);
          warned.delete(name);
          markDirty(name);
          schedule();
        }
      };
      adopt();
      const unsubscribe = source.subscribe(adopt);
      return () => {
        unsubscribe();
        sources.delete(name);
      };
    },
    setElementState,
    press(id) {
      setElementState(id, { pressed: true });
      dispatch(id, 'onPress');
    },
    release(id, tapped) {
      setElementState(id, { pressed: false });
      dispatch(id, 'onRelease');
      if (tapped) {
        dispatch(id, 'onTap');
      }
    },
    drag(id, pointer) {
      if (pointer !== undefined) {
        setElementState(id, { pointer });
      }
      dispatch(id, 'onDrag');
    },
    tick(seconds) {
      for (const handler of graph.handlers) {
        if (handler.event === TICK_EVENT) {
          runHandler(handler, seconds);
        }
      }
    },
    flush,
    onRender(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attach(target) {
      const send = (change: LiveChange) => {
        if (change.kind === 'widget') {
          target.setWidgetValue?.(change.id, change.value);
        } else {
          for (const owner of change.owners) {
            target.setShaderParameters?.(owner, change.parameters);
          }
        }
      };
      liveListeners.add(send);
      for (const change of liveState.values()) {
        send(change);
      }
      const offRender = this.onRender(result => target.update({ svg: result.svg }));
      const off = () => {
        offRender();
        liveListeners.delete(send);
      };
      for (const binding of graph.bindings) {
        dirty.add(binding);
      }
      flush();
      return off;
    },
  };
}

export interface RenderBoundOptions extends RenderOptions {
  data?: Record<string, Row | Row[]>;
}

export function renderBound(sfl: string, options: RenderBoundOptions = {}): RenderResult {
  const { data = {}, ...renderOptions } = options;
  const runtime = createBindingRuntime(sfl, { renderOptions });
  for (const [name, rows] of Object.entries(data)) {
    runtime.registerSource(name, { get: () => rows, subscribe: () => () => undefined });
  }
  runtime.flush();
  return renderCanvas(runtime.input, renderOptions);
}
