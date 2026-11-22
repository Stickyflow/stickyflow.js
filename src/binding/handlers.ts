import { markDirty, schedule } from './evaluation';
import { collectRefs, evaluate } from './expression';
import { type RuntimeState, readValue } from './runtimeState';
import type { ElementState } from './runtimeTypes';
import type { BoundHandler, Row } from './types';
import { TICK_EVENT } from './types';
import { writeFields } from './writes';

export function runHandler(state: RuntimeState, handler: BoundHandler, delta?: number, selfId?: string): void {
  const env = {
    read: (path: string[]) => {
      if (path[0] === 'time' && path[1] === 'delta') {
        return delta ?? 0;
      }
      if (path[0] === 'self' && path[1] === 'id' && selfId) {
        return selfId;
      }
      return readValue(state, path);
    },
  };
  // Every right side reads the values from before the handler, and the handler writes each source once, at its end: so a handler is
  // one change, and the host never sees half of it. A field written twice keeps the last value.
  const writes = new Map<string, { fields: Row; line: number; col: number }>();
  for (const assignment of handler.assignments) {
    const readable = collectRefs(assignment.expr).every(
      ([name]) =>
        name === 'time' ||
        (name === 'self' && Boolean(selfId)) ||
        state.sources.has(name) ||
        state.elementState.has(name),
    );
    if (!readable) {
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
    const write = writes.get(assignment.source) ?? { fields: {}, line: assignment.line, col: assignment.col };
    write.fields[assignment.field] = value;
    writes.set(assignment.source, write);
  }
  for (const [source, { fields, line, col }] of writes) {
    writeFields(state, source, fields, line, col);
  }
}

export function dispatch(state: RuntimeState, id: string, event: string): void {
  for (const handler of state.graph.handlers) {
    if (handler.event === event && handler.ownerKind !== 'DataSource' && handler.ownerPath[0] === id) {
      runHandler(state, handler, undefined, id);
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
