import { describe, expect, it, vi } from 'vitest';
import { Emitter } from '../src/eventing/emitter';

interface TestEvents {
  ping: { value: number };
}

describe('Emitter', () => {
  it('delivers an event to every handler', () => {
    const emitter = new Emitter<TestEvents>();
    const seen: number[] = [];
    emitter.on('ping', event => seen.push(event.value));
    emitter.on('ping', event => seen.push(event.value * 2));
    emitter.emit('ping', { value: 3 });
    expect(seen).toEqual([3, 6]);
  });

  it('keeps running later handlers when one throws', () => {
    const emitter = new Emitter<TestEvents>();
    const seen: number[] = [];
    emitter.on('ping', () => {
      throw new Error('host handler failed');
    });
    emitter.on('ping', event => seen.push(event.value));

    const spy = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(() => undefined);
    expect(() => emitter.emit('ping', { value: 7 })).not.toThrow();
    spy.mockRestore();

    expect(seen).toEqual([7]);
  });

  it('rethrows a handler error asynchronously instead of swallowing it', async () => {
    const emitter = new Emitter<TestEvents>();
    const failure = new Error('host handler failed');
    emitter.on('ping', () => {
      throw failure;
    });
    const scheduled: Array<() => void> = [];
    const spy = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(task => {
      scheduled.push(task);
    });
    emitter.emit('ping', { value: 1 });
    spy.mockRestore();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]).toThrow(failure);
  });

  it('unsubscribing stops delivery', () => {
    const emitter = new Emitter<TestEvents>();
    const seen: number[] = [];
    const off = emitter.on('ping', event => seen.push(event.value));
    emitter.emit('ping', { value: 1 });
    off();
    emitter.emit('ping', { value: 2 });
    expect(seen).toEqual([1]);
  });

  it('a handler registered during emit does not receive the in-flight event', () => {
    const emitter = new Emitter<TestEvents>();
    const seen: string[] = [];
    emitter.on('ping', () => {
      seen.push('first');
      emitter.on('ping', () => seen.push('added'));
    });
    emitter.emit('ping', { value: 1 });
    expect(seen).toEqual(['first']);
    emitter.emit('ping', { value: 2 });
    expect(seen).toEqual(['first', 'first', 'added']);
  });

  it('clear removes every handler', () => {
    const emitter = new Emitter<TestEvents>();
    const seen: number[] = [];
    emitter.on('ping', event => seen.push(event.value));
    emitter.clear();
    emitter.emit('ping', { value: 1 });
    expect(seen).toEqual([]);
  });
});
