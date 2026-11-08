import { type ComponentValue, getComponentDescriptor } from '../model/component';
import type { RenderResult } from '../render';
import { documentToRenderInput } from '../renderInput/fromSfl';
import type { RenderInput } from '../renderInput/types';
import { parse } from '../sflLanguage';
import type { SflDocument } from '../sflLanguage/ast';
import { findComponent } from './applyValue';
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
  renderNeeded: boolean;
  // The document as it was written, made again with the values of its parameters whenever they change.
  document: SflDocument;
  remakePending: boolean;
}

function initialValue(input: RenderInput, id: string, componentType: string | undefined): ComponentValue {
  const descriptor = getComponentDescriptor(componentType);
  const current = findComponent(input, id)?.value;
  if (current === undefined) {
    return descriptor?.value?.default ?? 0;
  }
  if (descriptor?.value?.type === 'number') {
    const value = Number(current);
    return Number.isFinite(value) ? value : descriptor.value.default;
  }
  return current;
}

export function createRuntimeState(sfl: string, options: BindingRuntimeOptions): RuntimeState {
  const document = parse(sfl);
  const graph = buildBindingGraph(document);
  const input = structuredClone(documentToRenderInput(document));
  const elementState = new Map<string, ElementState>();
  addElementStates(graph, input, elementState);
  return {
    options,
    graph,
    diagnostics: [...graph.diagnostics],
    input,
    sources: new Map(),
    applied: new Map(),
    dirty: new Set(),
    listeners: new Set(),
    warned: new Set(),
    liveListeners: new Set(),
    liveState: new Map(),
    elementState,
    scheduled: false,
    renderNeeded: false,
    document,
    remakePending: false,
  };
}

// Every element gets its state, and one that is new after the document was made again starts at rest.
export function addElementStates(
  graph: BindingGraph,
  input: RenderInput,
  elementState: Map<string, ElementState>,
): void {
  for (const [name, info] of graph.elements) {
    if (!graph.contracts.has(name) && !elementState.has(name)) {
      elementState.set(name, {
        pressed: false,
        hovered: false,
        focused: false,
        pointer: 0,
        value: initialValue(input, name, info.componentType),
      });
    }
  }
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
    .find(name => name !== 'self' && !state.sources.has(name) && !state.elementState.has(name));
}
