import type { Row } from './types';

export type SourceListener = () => void;

export interface DataSource {
  get(): readonly Row[] | Row;
  subscribe(listener: SourceListener): () => void;
  // The fields the host lets the document write. Without it, the document decides; with it, a write to any other field is an
  // error, found when the source is registered, and is never made.
  readonly writable?: readonly string[];
}

export interface MutableDataSource extends DataSource {
  set(next: readonly Row[] | Row): void;
}

// A record source the document writes to field by field. Each handler, and each move of a control, gives `write` the fields it
// changed, in one call. The host takes them over, tells its listeners, and may pass them on, as to a device.
export interface WritableDataSource extends DataSource {
  write(fields: Readonly<Row>): void;
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
