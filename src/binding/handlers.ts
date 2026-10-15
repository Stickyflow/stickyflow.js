import type { MutableDataSource } from './dataSource';
import { markDirty, schedule } from './evaluation';
import { collectRefs, evaluate } from './expression';
import { type RuntimeState, readValue } from './runtimeState';
import type { ElementState } from './runtimeTypes';
import type { BoundHandler, Row } from './types';
import { TICK_EVENT } from './types';

export function runHandler(state: RuntimeState, handler: BoundHandler, delta?: number): void {
  const env = {
    read: (path: string[]) => (path[0] === 'time' && path[1] === 'delta' ? (delta ?? 0) : readValue(state, path)),
  };
  for (const assignment of handler.assignments) {
    const target = state.sources.get(assignment.source);
    const readable = collectRefs(assignment.expr).every(
      ([name]) => name === 'time' || state.sources.has(name) || state.elementState.has(name),
    );
    if (!target || !('set' in target) || !readable) {
      continue;
    }
    let value = evaluate(assignment.expr, env);
    if (typeof value === 'number') {
      value =
        state.graph.contracts.get(assignment.source)?.declared[assignment.field] === 'int' ? Math.round(value) : value;
      if (!Number.isFinite(value)) {
        continue;
      }
    }
    const row = target.get() as Row;
    if (row[assignment.field] !== value) {
      (target as MutableDataSource).set({ ...row, [assignment.field]: value });
    }
  }
}

export function dispatch(state: RuntimeState, id: string, event: string): void {
  for (const handler of state.graph.handlers) {
    if (handler.event === event && handler.ownerKind !== 'DataSource' && handler.ownerPath[0] === id) {
      runHandler(state, handler);
    }
  }
}

export function runTick(state: RuntimeState, seconds: number): void {
  for (const handler of state.graph.handlers) {
    if (handler.event === TICK_EVENT) {
      runHandler(state, handler, seconds);
    }
  }
}

export function setElementState(state: RuntimeState, id: string, patch: Partial<ElementState>): void {
  const current = state.elementState.get(id);
  if (!current || (Object.keys(patch) as Array<keyof ElementState>).every(key => current[key] === patch[key])) {
    return;
  }
  Object.assign(current, patch);
  markDirty(state, id);
  schedule(state);
}
