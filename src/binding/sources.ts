import { eachSources } from '../sflLanguage/expansion';
import { checkData } from './checkData';
import type { DataSource } from './dataSource';
import { markDirty, schedule } from './evaluation';
import { requestRemake } from './remake';
import type { RuntimeState } from './runtimeState';
import { checkHostWritable } from './writes';

// A source as it was registered. It outlives the document: when another document takes its place, the source and its listener stay.
export interface Registration {
  source: DataSource;
  // Made by the runtime itself, for a Parameters block.
  own: boolean;
  unsubscribe: () => void;
}

// New values of parameters change what the document makes, so it is made again. The same holds for a table a Repeat runs over: its
// rows are what that Repeat makes.
function remade(state: RuntimeState, name: string): boolean {
  const { blocks } = state.document;
  return Boolean(state.graph.contracts.get(name)?.parameters) || eachSources(blocks).has(name);
}

// Takes the data of a registered source into the document that runs now, if that document declares it.
function adopt(state: RuntimeState, name: string, registration: Registration): void {
  const contract = state.graph.contracts.get(name);
  if (!contract || Boolean(contract.parameters) !== registration.own) {
    return;
  }
  const problem = checkData(contract, registration.source.get());
  if (problem) {
    state.diagnostics.push({ severity: 'error', code: 'data-type-mismatch', message: problem, line: 0, col: 0 });
    return;
  }
  state.sources.set(name, registration.source);
  state.warned.delete(name);
  state.warned.delete(`write:${name}`);
  markDirty(state, name);
  schedule(state);
}

export function registerSource(state: RuntimeState, name: string, source: DataSource, own = false): () => void {
  if (!state.graph.contracts.has(name)) {
    throw new Error(`No DataSource '${name}' is declared in the SFL.`);
  }
  if (source.writable) {
    checkHostWritable(state, name, source.writable);
  }
  const registration: Registration = { source, own, unsubscribe: () => undefined };
  state.registered.set(name, registration);
  adopt(state, name, registration);
  // The source the runtime made itself holds the values the document already has.
  if (!own && remade(state, name)) {
    requestRemake(state);
  }
  registration.unsubscribe = source.subscribe(() => {
    if (state.registered.get(name) !== registration) {
      return;
    }
    adopt(state, name, registration);
    if (state.sources.get(name) === source && remade(state, name)) {
      requestRemake(state);
    }
  });
  return () => {
    registration.unsubscribe();
    if (state.registered.get(name) === registration) {
      state.registered.delete(name);
      state.sources.delete(name);
    }
  };
}
