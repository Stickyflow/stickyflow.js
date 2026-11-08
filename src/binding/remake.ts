import { documentToRenderInput } from '../renderInput/fromSfl';
import { withParameterValues } from '../sflLanguage/expansion';
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

// The document is made again with the new values: what its Repeats make, what its parameters compute, and every binding on it.
export function remake(state: RuntimeState): void {
  const document = withParameterValues(state.document, parameterValues(state));
  state.graph = buildBindingGraph(document);
  state.input = structuredClone(documentToRenderInput(document));
  addElementStates(state.graph, state.input, state.elementState);
  state.applied.clear();
  for (const binding of state.graph.bindings) {
    state.dirty.add(binding);
  }
  state.renderNeeded = true;
  flush(state);
}

// A control is dragged with many small steps; the document is made again at most once a frame.
export function requestRemake(state: RuntimeState): void {
  if (state.remakePending) {
    return;
  }
  state.remakePending = true;
  const run = () => {
    state.remakePending = false;
    remake(state);
  };
  const frame = (globalThis as { requestAnimationFrame?: (callback: () => void) => number }).requestAnimationFrame;
  if (frame) {
    frame(run);
  } else {
    queueMicrotask(run);
  }
}
