import type { Row } from './types';

export type SourceListener = () => void;

export interface DataSource {
  get(): readonly Row[] | Row;
  subscribe(listener: SourceListener): () => void;
}

export interface MutableDataSource extends DataSource {
  set(next: readonly Row[] | Row): void;
}

export function createDataSource(initial: readonly Row[] | Row): MutableDataSource {
  let current = initial;
  const listeners = new Set<SourceListener>();
  return {
    get: () => current,
    set(next) {
      current = next;
      for (const listener of [...listeners]) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
