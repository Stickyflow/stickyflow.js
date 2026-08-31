export type Unsubscribe = () => void;

export class Emitter<EventMap extends object> {
  private handlers = new Map<keyof EventMap, Set<(event: never) => void>>();

  on<T extends keyof EventMap>(name: T, handler: (event: EventMap[T]) => void): Unsubscribe {
    let set = this.handlers.get(name);
    if (!set) {
      set = new Set();
      this.handlers.set(name, set);
    }
    set.add(handler as (event: never) => void);
    return () => set!.delete(handler as (event: never) => void);
  }

  emit<T extends keyof EventMap>(name: T, event: EventMap[T]): void {
    this.handlers.get(name)?.forEach(handler => {
      (handler as (event: EventMap[T]) => void)(event);
    });
  }

  clear(): void {
    this.handlers.clear();
  }
}
