import { documentToRenderInput } from '../renderInput/fromSfl';
import type { RenderInput } from '../renderInput/types';
import { parse } from '../sflLanguage';
import type { SflDocument } from '../sflLanguage/ast';
import { eachSources, withParameterValues } from '../sflLanguage/expansion';
import { checkData } from './checkData';
import { createDataSource } from './dataSource';
import { flush } from './evaluation';
import { type BindingGraph, buildBindingGraph } from './graph';
import { addElementStates, type RuntimeState } from './runtimeState';
import type { DocumentCheck } from './runtimeTypes';
import { registerSource } from './sources';
import type { BindingDiagnostic, Row } from './types';
import { hostWriteProblems, sourceWrites } from './writes';

interface Candidate {
  written: SflDocument;
  graph: BindingGraph;
  input: RenderInput;
  parameters: Map<string, Record<string, number>>;
  diagnostics: BindingDiagnostic[];
  writes: Record<string, string[]>;
}

function failed(diagnostics: BindingDiagnostic[]): boolean {
  return diagnostics.some(diagnostic => diagnostic.severity === 'error');
}

function readError(error: unknown): BindingDiagnostic {
  const at = error as { line?: number; col?: number; message?: string };
  return {
    severity: 'error',
    code: 'document-not-read',
    message: at.message ?? String(error),
    line: at.line ?? 0,
    col: at.col ?? 0,
  };
}

// The values the parameters have now, for those the new document still has under the same name.
function keptParameters(state: RuntimeState, graph: BindingGraph): Map<string, Record<string, number>> {
  const parameters = new Map<string, Record<string, number>>();
  for (const contract of graph.contracts.values()) {
    if (!contract.parameters) {
      continue;
    }
    const before = state.registered.get(contract.name);
    const row = before?.own ? (before.source.get() as Row) : undefined;
    const values = { ...contract.parameters };
    for (const key of Object.keys(values)) {
      const value = row?.[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        values[key] = value;
      }
    }
    parameters.set(contract.name, values);
  }
  return parameters;
}

// The fields of sources of the host that the document writes, by a handler or a control.
function hostWrites(graph: BindingGraph): Record<string, string[]> {
  const writes: Record<string, string[]> = {};
  for (const { source, field } of sourceWrites(graph)) {
    if (graph.contracts.get(source)?.parameters) {
      continue;
    }
    writes[source] ??= [];
    if (!writes[source].includes(field)) {
      writes[source].push(field);
    }
  }
  return writes;
}

// Reads and checks a document against the sources the host registered, without touching the one that runs.
function prepare(state: RuntimeState, sfl: string): Candidate | BindingDiagnostic[] {
  try {
    const written = parse(sfl);
    const parameters = keptParameters(state, buildBindingGraph(written));
    const values = new Map<string, number>();
    for (const [name, row] of parameters) {
      for (const [key, value] of Object.entries(row)) {
        values.set(`${name}.${key}`, value);
      }
    }
    const made = withParameterValues(written, values);
    const tables = new Map<string, Row[]>();
    for (const name of eachSources(written.blocks)) {
      const rows = state.registered.get(name)?.source.get();
      if (Array.isArray(rows)) {
        tables.set(name, rows as Row[]);
      }
    }
    const graph = buildBindingGraph(made, tables);
    const diagnostics = [...graph.diagnostics];
    for (const [name, { source, own }] of state.registered) {
      const contract = graph.contracts.get(name);
      if (own || !contract || contract.parameters) {
        continue;
      }
      const problem = checkData(contract, source.get());
      if (problem) {
        diagnostics.push({ severity: 'error', code: 'data-type-mismatch', message: problem, line: 0, col: 0 });
      }
      if (source.writable) {
        diagnostics.push(...hostWriteProblems(graph, name, source.writable));
      }
    }
    const input = structuredClone(documentToRenderInput(made, tables));
    return { written, graph, input, parameters, diagnostics, writes: hostWrites(graph) };
  } catch (error) {
    return [readError(error)];
  }
}

export function checkDocument(state: RuntimeState, sfl: string): DocumentCheck {
  const candidate = prepare(state, sfl);
  if (Array.isArray(candidate)) {
    return { ok: false, diagnostics: candidate, writes: {} };
  }
  return { ok: !failed(candidate.diagnostics), diagnostics: candidate.diagnostics, writes: candidate.writes };
}

function put<K, V>(target: Map<K, V>, from: Map<K, V>): void {
  target.clear();
  for (const [key, value] of from) {
    target.set(key, value);
  }
}

// Another document takes the place of the one that runs. The sources the host registered stay as they are, with their listeners, and
// the parameters keep their values. A document with an error is not taken, and the one that runs goes on.
export function replaceDocument(state: RuntimeState, sfl: string): DocumentCheck {
  const candidate = prepare(state, sfl);
  if (Array.isArray(candidate)) {
    return { ok: false, diagnostics: candidate, writes: {} };
  }
  const { diagnostics, writes, graph, input } = candidate;
  if (failed(diagnostics)) {
    return { ok: false, diagnostics, writes };
  }
  const before = {
    document: state.document,
    graph: state.graph,
    input: state.input,
    sources: new Map(state.sources),
    registered: new Map(state.registered),
    applied: new Map(state.applied),
    liveState: new Map(state.liveState),
    elementState: new Map(state.elementState),
    diagnostics: [...state.diagnostics],
    warned: new Set(state.warned),
  };
  const added: Array<() => void> = [];
  try {
    state.document = candidate.written;
    state.graph = graph;
    state.input = input;
    for (const [name, registration] of before.registered) {
      const contract = graph.contracts.get(name);
      if (registration.own) {
        state.registered.delete(name);
        state.sources.delete(name);
      } else if (contract && !contract.parameters) {
        state.sources.set(name, registration.source);
      } else {
        state.sources.delete(name);
      }
    }
    for (const [name, row] of candidate.parameters) {
      added.push(registerSource(state, name, createDataSource(row), true));
    }
    for (const name of [...state.elementState.keys()]) {
      if (!graph.elements.has(name)) {
        state.elementState.delete(name);
      }
    }
    addElementStates(graph, input, state.elementState);
    state.applied.clear();
    state.liveState.clear();
    state.warned.clear();
    state.diagnostics.splice(0, state.diagnostics.length, ...diagnostics);
    state.dirty.clear();
    for (const binding of graph.bindings) {
      state.dirty.add(binding);
    }
    state.renderNeeded = true;
    state.remakePending = false;
    // What a target was told for the old document no longer holds; the new one says its values again.
    for (const reset of [...state.resetListeners]) {
      reset();
    }
    flush(state);
  } catch (error) {
    for (const release of added) {
      release();
    }
    state.document = before.document;
    state.graph = before.graph;
    state.input = before.input;
    put(state.sources, before.sources);
    put(state.registered, before.registered);
    put(state.applied, before.applied);
    put(state.liveState, before.liveState);
    put(state.elementState, before.elementState);
    state.diagnostics.splice(0, state.diagnostics.length, ...before.diagnostics);
    state.warned.clear();
    for (const key of before.warned) {
      state.warned.add(key);
    }
    state.dirty.clear();
    for (const change of state.liveState.values()) {
      for (const listener of [...state.liveListeners]) {
        listener(change);
      }
    }
    state.renderNeeded = true;
    flush(state);
    return { ok: false, diagnostics: [readError(error)], writes };
  }
  for (const registration of before.registered.values()) {
    if (registration.own) {
      registration.unsubscribe();
    }
  }
  return { ok: true, diagnostics, writes };
}
