export type Unsubscribe = () => void;

export class Emitter<EventMap extends object> {
  private handlers = new Map<keyof EventMap, Set<(event: never) => void>>();

  on<T extends keyof EventMap>(name: T, handler: (event: EventMap[T]) => void): Unsubscribe {
    const eventHandlers = this.handlers.get(name) ?? new Set<(event: never) => void>();
    this.handlers.set(name, eventHandlers);

    const storedHandler = handler as (event: never) => void;
    eventHandlers.add(storedHandler);
    return () => eventHandlers.delete(storedHandler);
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
