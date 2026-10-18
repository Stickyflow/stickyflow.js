import { type RenderOptions, type RenderResult, renderCanvas } from '../render';
import { checkData } from './checkData';
import type { DataSource } from './dataSource';
import { flush, markDirty, schedule } from './evaluation';
import { dispatch, runTick, setElementState } from './handlers';
import { interactiveElements } from './interactive';
import { createRuntimeState, type RuntimeState } from './runtimeState';
import type { BindingRuntime, BindingRuntimeOptions, BindingTarget, LiveChange } from './runtimeTypes';
import type { Row } from './types';
import { activateElement, changeComponentValue, pressElement, releaseElement } from './userInput';

function registerSource(state: RuntimeState, name: string, source: DataSource): () => void {
  const contract = state.graph.contracts.get(name);
  if (!contract) {
    throw new Error(`No DataSource '${name}' is declared in the SFL.`);
  }
  const accept = (): boolean => {
    const problem = checkData(contract, source.get());
    if (problem) {
      state.diagnostics.push({ severity: 'error', code: 'data-type-mismatch', message: problem, line: 0, col: 0 });
      return false;
    }
    return true;
  };
  const adopt = () => {
    if (accept()) {
      state.sources.set(name, source);
      state.warned.delete(name);
      markDirty(state, name);
      schedule(state);
    }
  };
  adopt();
  const unsubscribe = source.subscribe(adopt);
  return () => {
    unsubscribe();
    state.sources.delete(name);
  };
}

function pushLiveChange(target: BindingTarget, change: LiveChange): void {
  if (change.kind === 'component') {
    (target.setComponentValue ?? target.setWidgetValue)?.call(target, change.id, change.value);
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
  for (const binding of state.graph.bindings) {
    state.dirty.add(binding);
  }
  flush(state);
  return () => {
    state.listeners.delete(listener);
    state.liveListeners.delete(send);
  };
}

export function createBindingRuntime(sfl: string, options: BindingRuntimeOptions = {}): BindingRuntime {
  const state = createRuntimeState(sfl, options);
  for (const binding of state.graph.bindings) {
    if (binding.dependencies.length === 0) {
      state.dirty.add(binding);
    }
  }
  if (state.dirty.size > 0) {
    schedule(state);
  }

  return {
    diagnostics: state.diagnostics,
    graph: state.graph,
    interactive: interactiveElements(state.graph),
    input: state.input,
    registerSource: (name, source) => registerSource(state, name, source),
    setElementState: (id, patch) => setElementState(state, id, patch),
    press: id => pressElement(state, id),
    release: (id, tapped) => releaseElement(state, id, tapped),
    activate: id => activateElement(state, id),
    change: (id, value) => changeComponentValue(state, id, value),
    drag(id, pointer) {
      if (pointer !== undefined) {
        setElementState(state, id, { pointer });
      }
      dispatch(state, id, 'onDrag');
    },
    tick: seconds => runTick(state, seconds),
    flush: () => flush(state),
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
