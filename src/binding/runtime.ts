import { type RenderOptions, type RenderResult, renderCanvas } from '../render';
import { sflToRenderInput } from '../renderInput/fromSfl';
import type { RenderInput } from '../renderInput/types';
import { parse } from '../sflLanguage';
import { evaluate } from './expression';
import { type BindingGraph, buildBindingGraph } from './graph';
import type { BindingDiagnostic, BindingValue, BoundProperty, DataSourceContract, ScalarType } from './types';

export type SourceListener = () => void;

export interface DataSource {
  get(): readonly Record<string, unknown>[] | Record<string, unknown>;
  subscribe(listener: SourceListener): () => void;
}

export interface MutableDataSource extends DataSource {
  set(next: readonly Record<string, unknown>[] | Record<string, unknown>): void;
}

export function createDataSource(initial: readonly Record<string, unknown>[] | Record<string, unknown>): MutableDataSource {
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
}

export interface BindingRuntime {
  readonly diagnostics: BindingDiagnostic[];
  readonly graph: BindingGraph;
  // The RenderInput with every bound property applied.
  readonly input: RenderInput;
  registerSource(name: string, source: DataSource): () => void;
  flush(): RenderResult | null;
  onRender(listener: (result: RenderResult) => void): () => void;
  attach(target: BindingTarget): () => void;
}

const typeOfValue = (value: unknown): string => (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' ? typeof value : 'other');

function checkData(contract: DataSourceContract, data: ReturnType<DataSource['get']>): string | null {
  const rows = Array.isArray(data) ? data : [data];
  if (contract.mode === 'table' !== Array.isArray(data)) {
    return `DataSource '${contract.name}' is a ${contract.mode} source but delivered ${Array.isArray(data) ? 'rows' : 'a record'}.`;
  }
  for (const row of rows as Record<string, unknown>[]) {
    for (const [field, type] of Object.entries(contract.fields) as Array<[string, ScalarType]>) {
      if (typeOfValue(row[field]) !== type) {
        return `'${contract.name}.${field}' should be ${type}, got ${typeOfValue(row[field])}.`;
      }
    }
  }
  return null;
}

type Apply = (input: RenderInput, owner: string, value: BindingValue) => void;

const APPLY: Record<string, Apply> = {
  'Chart.category': (input, owner, value) => {
    const chart = input.charts?.find(candidate => candidate.id === owner);
    if (chart) {
      chart.config = { ...(chart.config ?? {}), categories: value as string[] } as typeof chart.config;
    }
  },
  'Chart.value': (input, owner, value) => {
    const chart = input.charts?.find(candidate => candidate.id === owner);
    if (!chart) {
      return;
    }
    if (chart.series.length === 0) {
      chart.series.push({ id: 'value', label: 'value', values: [] });
    }
    chart.series[0].values = value as number[];
  },
  'Chart.text': (input, owner, value) => {
    const chart = input.charts?.find(candidate => candidate.id === owner);
    if (chart) {
      chart.title = value as string;
    }
  },
  'Shape.text': (input, owner, value) => {
    const shape = input.shapes.find(candidate => candidate.id === owner);
    if (shape) {
      shape.text = value as string;
    }
  },
  'Widget.value': (input, owner, value) => {
    const widget = input.widgets?.find(candidate => candidate.id === owner);
    if (widget) {
      widget.value = String(value);
    }
  },
};

export function createBindingRuntime(sfl: string, options: BindingRuntimeOptions = {}): BindingRuntime {
  const graph = buildBindingGraph(parse(sfl));
  const diagnostics = [...graph.diagnostics];
  const input = structuredClone(sflToRenderInput(sfl));
  const sources = new Map<string, DataSource>();
  const applied = new Map<string, string>();
  const dirty = new Set<BoundProperty>();
  const listeners = new Set<(result: RenderResult) => void>();
  let scheduled = false;

  const read = (path: string[]): BindingValue => {
    const [name, field] = path;
    const contract = graph.contracts.get(name);
    const data = sources.get(name)?.get();
    if (!contract || data === undefined) {
      throw new Error(`DataSource '${name}' has no data yet.`);
    }
    return Array.isArray(data)
      ? (data.map(row => row[field]) as BindingValue)
      : ((data as Record<string, unknown>)[field] as BindingValue);
  };

  const evaluateBinding = (binding: BoundProperty): boolean => {
    if (!binding.dependencies.every(dependency => sources.has(dependency.split('.')[0]))) {
      return false;
    }
    const value = evaluate(binding.expr, { read });
    const key = JSON.stringify(value);
    if (applied.get(binding.id) === key) {
      return false;
    }
    applied.set(binding.id, key);
    APPLY[`${binding.ownerKind}.${binding.property}`]?.(input, binding.ownerName, value);
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

  // Expressions without a data source never change, so they are applied once.
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
      if (accept()) {
        sources.set(name, source);
        markDirty(name);
        schedule();
      }
      const unsubscribe = source.subscribe(() => {
        if (accept()) {
          sources.set(name, source);
          markDirty(name);
          schedule();
        }
      });
      return () => {
        unsubscribe();
        sources.delete(name);
      };
    },
    flush,
    onRender(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attach(target) {
      const off = this.onRender(result => target.update({ svg: result.svg }));
      for (const binding of graph.bindings) {
        dirty.add(binding);
      }
      flush();
      return off;
    },
  };
}
