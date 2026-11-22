import { documentToRenderInput } from '../renderInput/fromSfl';
import { eachSources, type Tables, withParameterValues } from '../sflLanguage/expansion';
import { flush } from './evaluation';
import { buildBindingGraph } from './graph';
import { addElementStates, type RuntimeState } from './runtimeState';
import type { Row } from './types';

// The values of all parameters, as their sources hold them now.
function parameterValues(state: RuntimeState): Map<string, number> {
  const values = new Map<string, number>();
  for (const contract of state.graph.contracts.values()) {
    if (!contract.parameters) {
      continue;
    }
    const row = state.sources.get(contract.name)?.get() as Row | undefined;
    for (const key of Object.keys(contract.fields)) {
      const value = Number(row?.[key]);
      if (Number.isFinite(value)) {
        values.set(`${contract.name}.${key}`, value);
      }
    }
  }
  return values;
}

// The rows of the tables a Repeat runs over, as their sources hold them now.
export function tableRows(state: RuntimeState): Tables {
  const tables = new Map<string, Row[]>();
  const { blocks } = state.document;
  for (const name of eachSources(blocks)) {
    const rows = state.sources.get(name)?.get();
    if (Array.isArray(rows)) {
      tables.set(name, rows as Row[]);
    }
  }
  return tables;
}

// The document is made again with the new values: what its Repeats make, what its parameters compute, and every binding on it.
export function remake(state: RuntimeState): void {
  const document = withParameterValues(state.document, parameterValues(state));
  const tables = tableRows(state);
  state.graph = buildBindingGraph(document, tables);
  state.input = structuredClone(documentToRenderInput(document, tables));
  addElementStates(state.graph, state.input, state.elementState);
  state.applied.clear();
  for (const binding of state.graph.bindings) {
    state.dirty.add(binding);
  }
  state.renderNeeded = true;
  flush(state);
}

// A control is dragged with many small steps; the document is made again at most once a frame.
// Makes the document again at once when that is asked for and still to come: a picture that is rendered without a viewer, as for
// print, has no next frame to wait for.
export function remakeNow(state: RuntimeState): void {
  if (state.remakePending) {
    state.remakePending = false;
    remake(state);
  }
}

export function requestRemake(state: RuntimeState): void {
  if (state.remakePending) {
    return;
  }
  state.remakePending = true;
  // Unless it was made in the meantime, by a flush that could not wait.
  const run = () => remakeNow(state);
  const frame = (globalThis as { requestAnimationFrame?: (callback: () => void) => number }).requestAnimationFrame;
  if (frame) {
    frame(run);
  } else {
    queueMicrotask(run);
  }
}
