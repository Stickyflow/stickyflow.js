import type { RenderResult } from '../render';
import { sflToRenderInput } from '../renderInput/fromSfl';
import type { RenderInput } from '../renderInput/types';
import { parse } from '../sflLanguage';
import type { DataSource } from './dataSource';
import { type BindingGraph, buildBindingGraph } from './graph';
import type { BindingRuntimeOptions, ElementState, LiveChange } from './runtimeTypes';
import type { BindingDiagnostic, BindingValue, BoundProperty } from './types';

export interface RuntimeState {
  options: BindingRuntimeOptions;
  graph: BindingGraph;
  diagnostics: BindingDiagnostic[];
  input: RenderInput;
  sources: Map<string, DataSource>;
  applied: Map<string, string>;
  dirty: Set<BoundProperty>;
  listeners: Set<(result: RenderResult) => void>;
  warned: Set<string>;
  liveListeners: Set<(change: LiveChange) => void>;
  liveState: Map<string, LiveChange>;
  elementState: Map<string, ElementState>;
  scheduled: boolean;
}

export function createRuntimeState(sfl: string, options: BindingRuntimeOptions): RuntimeState {
  const graph = buildBindingGraph(parse(sfl));
  const elementState = new Map<string, ElementState>();
  for (const name of graph.elements.keys()) {
    if (!graph.contracts.has(name)) {
      elementState.set(name, { pressed: false, hovered: false, pointer: 0 });
    }
  }
  return {
    options,
    graph,
    diagnostics: [...graph.diagnostics],
    input: structuredClone(sflToRenderInput(sfl)),
    sources: new Map(),
    applied: new Map(),
    dirty: new Set(),
    listeners: new Set(),
    warned: new Set(),
    liveListeners: new Set(),
    liveState: new Map(),
    elementState,
    scheduled: false,
  };
}

export function readValue(state: RuntimeState, path: string[]): BindingValue {
  const [name, field] = path;
  const element = state.sources.has(name) ? undefined : state.elementState.get(name);
  if (element) {
    return element[field as keyof ElementState];
  }
  const data = state.sources.get(name)?.get();
  if (data === undefined) {
    throw new Error(`DataSource '${name}' has no data yet.`);
  }
  return Array.isArray(data)
    ? (data.map(row => row[field]) as BindingValue)
    : ((data as Record<string, unknown>)[field] as BindingValue);
}

export function missingSource(state: RuntimeState, binding: BoundProperty): string | undefined {
  return binding.dependencies
    .map(dependency => dependency.split('.')[0])
    .find(name => !state.sources.has(name) && !state.elementState.has(name));
}
