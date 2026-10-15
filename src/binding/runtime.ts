import { type RenderOptions, type RenderResult, renderCanvas } from '../render';
import { sflToRenderInput } from '../renderInput/fromSfl';
import type { RenderInput } from '../renderInput/types';
import { parse } from '../sflLanguage';
import { collectRefs, evaluate } from './expression';
import { type BindingGraph, buildBindingGraph } from './graph';
import { type InteractiveElements, interactiveElements } from './interactive';
import type { BindingDiagnostic, BindingValue, BoundHandler, BoundProperty, DataSourceContract, Row } from './types';
import { TICK_EVENT } from './types';

export type SourceListener = () => void;

export interface DataSource {
  get(): readonly Row[] | Row;
  subscribe(listener: SourceListener): () => void;
}

export interface MutableDataSource extends DataSource {
  set(next: readonly Row[] | Row): void;
}

export function createDataSource(initial: readonly Row[] | Row): MutableDataSource {
  let current = initial;
  const listeners = new Set<SourceListener>();
  return {
    get: () => current,
    set(next) {
      current = next;
      for (const listener of [...listeners]) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export interface BindingRuntimeOptions {
  renderOptions?: RenderOptions;
}

export interface BindingTarget {
  update(next: { svg: string }): void;
  // Widget values and shader parameters change live, without redrawing the SVG.
  setWidgetValue?(widgetId: string, value: string | number): unknown;
  setShaderParameters?(ownerId: string, parameters: Record<string, number>): unknown;
}

type LiveChange =
  | { kind: 'widget'; id: string; value: number }
  | { kind: 'shader'; owners: string[]; parameters: Record<string, number> };

// What an expression can read about an element: id.pressed, id.hovered, and id.pointer on a widget with a scale.
export interface ElementState {
  pressed: boolean;
  hovered: boolean;
  pointer: number;
}

export interface BindingRuntime {
  readonly diagnostics: BindingDiagnostic[];
  readonly graph: BindingGraph;
  // Which elements the host has to deliver the pointer to.
  readonly interactive: InteractiveElements;
  // The RenderInput with every bound property applied.
  readonly input: RenderInput;
  registerSource(name: string, source: DataSource): () => void;
  // The host reports what the pointer does; the document says what follows from it (onPress, onRelease, onTap, onDrag).
  setElementState(id: string, state: Partial<ElementState>): void;
  press(id: string): void;
  // tapped: the pointer went up on the element it went down on.
  release(id: string, tapped: boolean): void;
  // pointer: the value under the pointer, for a widget with a scale.
  drag(id: string, pointer?: number): void;
  // Runs the onTick handlers of the data sources; the host calls it once per frame with the seconds since the last call.
  tick(seconds: number): void;
  flush(): RenderResult | null;
  onRender(listener: (result: RenderResult) => void): () => void;
  attach(target: BindingTarget): () => void;
}

const typeOfValue = (value: unknown): string =>
  typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' ? typeof value : 'other';

function checkData(contract: DataSourceContract, data: ReturnType<DataSource['get']>): string | null {
  const rows = Array.isArray(data) ? data : [data];
  if (contract.mode === 'table' !== Array.isArray(data)) {
    return `DataSource '${contract.name}' is a ${contract.mode} source but delivered ${Array.isArray(data) ? 'rows' : 'a record'}.`;
  }
  for (const row of rows as Row[]) {
    for (const [field, type] of Object.entries(contract.fields)) {
      if (typeOfValue(row[field]) !== type) {
        return `'${contract.name}.${field}' should be ${contract.declared[field]}, got ${typeOfValue(row[field])}.`;
      }
      if (contract.declared[field] === 'int' && !Number.isInteger(row[field])) {
        return `'${contract.name}.${field}' should be a whole number (int), got ${String(row[field])}.`;
      }
    }
  }
  return null;
}

type Apply = (input: RenderInput, path: string[], value: BindingValue) => void;

const findChart = (input: RenderInput, id: string) => input.charts?.find(candidate => candidate.id === id);

function applyToSeries(input: RenderInput, path: string[], change: (series: { values: unknown; label: string }) => void): void {
  const chart = findChart(input, path[0]);
  if (!chart) {
    return;
  }
  let series = chart.series.find(candidate => candidate.id === path[1]);
  if (!series) {
    series = { id: path[1], label: path[1], values: [] };
    chart.series.push(series);
  }
  change(series);
}

function setShape(input: RenderInput, path: string[], change: (shape: RenderInput['shapes'][number]) => void): void {
  const shape = input.shapes.find(candidate => candidate.id === path[0]);
  if (shape) {
    change(shape);
  }
}

const APPLY: Record<string, Apply> = {
  'Chart.categories': (input, path, value) => {
    const chart = findChart(input, path[0]);
    if (chart) {
      chart.config = { ...(chart.config ?? {}), categories: value as string[] } as typeof chart.config;
    }
  },
  'Chart.text': (input, path, value) => {
    const chart = findChart(input, path[0]);
    if (chart) {
      chart.title = value as string;
    }
  },
  'Series.values': (input, path, value) => applyToSeries(input, path, series => (series.values = value)),
  'Series.label': (input, path, value) => applyToSeries(input, path, series => (series.label = value as string)),
  'Shape.text': (input, path, value) => {
    const shape = input.shapes.find(candidate => candidate.id === path[0]);
    if (shape) {
      shape.text = value as string;
    }
  },
  'Shape.fill': (input, path, value) => setShape(input, path, shape => (shape.fillColor = value as string)),
  'Shape.stroke': (input, path, value) => setShape(input, path, shape => (shape.strokeColor = value as string)),
  'Shape.textColor': (input, path, value) => setShape(input, path, shape => (shape.textColor = value as string)),
  'Shape.opacity': (input, path, value) => setShape(input, path, shape => (shape.opacity = value as number)),
  'Widget.value': (input, path, value) => {
    const widget = input.widgets?.find(candidate => candidate.id === path[0]);
    if (widget) {
      widget.value = String(value);
    }
  },
};

function applyShader(input: RenderInput, binding: BoundProperty, value: BindingValue): string[] {
  const owners: string[] = [];
  for (const shape of input.shapes) {
    if (shape.shader?.name === binding.ownerPath[0]) {
      shape.shader.parameters = { ...shape.shader.parameters, [binding.property]: value as number };
      owners.push(shape.id);
    }
  }
  return owners;
}

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
    binding.dependencies.map(dependency => dependency.split('.')[0]).find(name => !sources.has(name) && !elementState.has(name));

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
      announce(binding.id, { kind: 'shader', owners: applyShader(input, binding, value), parameters: { [binding.property]: value as number } });
      return false;
    }
    APPLY[`${binding.ownerKind === 'Text' ? 'Shape' : binding.ownerKind}.${binding.property}`]?.(input, binding.ownerPath, value);
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
        bindings.forEach(binding => dirty.add(binding));
      }
    }
  };

  // A handler writes record fields one after the other, each assignment seeing what the one before it wrote. An int field takes the
  // nearest whole number. What it cannot read or write yet (a source nobody registered) it leaves alone.
  const runHandler = (handler: BoundHandler, delta?: number) => {
    const env = { read: (path: string[]) => (path[0] === 'time' && path[1] === 'delta' ? (delta ?? 0) : read(path)) };
    for (const assignment of handler.assignments) {
      const target = sources.get(assignment.source);
      const readable = collectRefs(assignment.expr).every(([name]) => name === 'time' || sources.has(name) || elementState.has(name));
      if (!target || !('set' in target) || !readable) {
        continue;
      }
      let value = evaluate(assignment.expr, env);
      if (typeof value === 'number') {
        value = graph.contracts.get(assignment.source)?.declared[assignment.field] === 'int' ? Math.round(value) : value;
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

  // Constants never change, so they apply once.
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

// A static render of the bound document with the given rows per DataSource, for previews and exports.
export function renderBound(sfl: string, options: RenderBoundOptions = {}): RenderResult {
  const { data = {}, ...renderOptions } = options;
  const runtime = createBindingRuntime(sfl, { renderOptions });
  for (const [name, rows] of Object.entries(data)) {
    runtime.registerSource(name, { get: () => rows, subscribe: () => () => undefined });
  }
  runtime.flush();
  return renderCanvas(runtime.input, renderOptions);
}
