import { type RenderOptions, type RenderResult, renderCanvas } from '../render';
import { createDataSource } from './dataSource';
import { flush, schedule } from './evaluation';
import { dispatch, runTick, setElementState } from './handlers';
import { interactiveElements } from './interactive';
import { remakeNow } from './remake';
import { checkDocument, replaceDocument } from './replace';
import { createRuntimeState, type RuntimeState } from './runtimeState';
import type { BindingRuntime, BindingRuntimeOptions, BindingTarget, LiveChange } from './runtimeTypes';
import { registerSource } from './sources';
import type { Row } from './types';
import {
  activateElement,
  changeComponentValue,
  focusElement,
  pressElement,
  releaseElement,
  slideElement,
} from './userInput';

function pushLiveChange(target: BindingTarget, change: LiveChange): void {
  if (change.kind === 'component') {
    (target.setComponentValue ?? target.setWidgetValue)?.call(target, change.id, change.value);
    return;
  }
  if (change.kind === 'mesh') {
    target.setMeshValue?.(change.id, change.property, change.value);
    return;
  }
  for (const owner of change.owners) {
    target.setShaderParameters?.(owner, change.parameters);
  }
}

function attach(state: RuntimeState, target: BindingTarget): () => void {
  const send = (change: LiveChange) => pushLiveChange(target, change);
  state.liveListeners.add(send);
  for (const change of state.liveState.values()) {
    send(change);
  }
  const listener = (result: RenderResult) => target.update({ svg: result.svg });
  state.listeners.add(listener);
  const reset = () => target.clearOverrides?.();
  state.resetListeners.add(reset);
  for (const binding of state.graph.bindings) {
    state.dirty.add(binding);
  }
  flush(state);
  return () => {
    state.listeners.delete(listener);
    state.liveListeners.delete(send);
    state.resetListeners.delete(reset);
  };
}

export function createBindingRuntime(sfl: string, options: BindingRuntimeOptions = {}): BindingRuntime {
  const state = createRuntimeState(sfl, options);
  // Each Parameters block is a record that starts with the values in the file, for controls to write and bindings to read.
  for (const contract of state.graph.contracts.values()) {
    if (contract.parameters) {
      registerSource(state, contract.name, createDataSource({ ...contract.parameters }), true);
    }
  }
  for (const binding of state.graph.bindings) {
    if (binding.dependencies.length === 0) {
      state.dirty.add(binding);
    }
  }
  if (state.dirty.size > 0) {
    schedule(state);
  }

  const interactiveOf = { graph: state.graph, value: interactiveElements(state.graph) };
  return {
    diagnostics: state.diagnostics,
    // Read anew, as the document is made again when a parameter changes.
    get graph() {
      return state.graph;
    },
    get interactive() {
      if (interactiveOf.graph !== state.graph) {
        interactiveOf.graph = state.graph;
        interactiveOf.value = interactiveElements(state.graph);
      }
      return interactiveOf.value;
    },
    get input() {
      return state.input;
    },
    registerSource: (name, source) => registerSource(state, name, source),
    sourceOf: name => state.sources.get(name),
    check: sfl => checkDocument(state, sfl),
    replace: sfl => replaceDocument(state, sfl),
    setElementState: (id, patch) => setElementState(state, id, patch),
    press: id => pressElement(state, id),
    release: (id, tapped) => releaseElement(state, id, tapped),
    activate: id => activateElement(state, id),
    focus: (id, focused) => focusElement(state, id, focused),
    submit: id => dispatch(state, id, 'onSubmit'),
    change: (id, value) => changeComponentValue(state, id, value),
    slide: (id, x, y) => slideElement(state, id, x, y),
    drag(id, pointer) {
      if (pointer !== undefined) {
        setElementState(state, id, { pointer });
      }
      dispatch(state, id, 'onDrag');
    },
    tick: seconds => runTick(state, seconds),
    flush: () => {
      remakeNow(state);
      return flush(state);
    },
    onRender(listener) {
      state.listeners.add(listener);
      return () => state.listeners.delete(listener);
    },
    attach: target => attach(state, target),
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
