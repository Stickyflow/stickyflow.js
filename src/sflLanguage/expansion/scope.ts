import type { Random } from './random';

export type Scalar = number | string | boolean;

// The names and the random numbers that the computed values of a Repeat cell or a Use are worked out with.
export interface Scope {
  vars: Map<string, Scalar>;
  random: Random;
  // What the messages of an error start with, as `Repeat trees` or `Use oak`.
  label: string;
  // A bare name that is one of the variables stands for its value, as the color of a Template written as `fill: color`.
  substitute?: boolean;
}

export function fail(scope: Scope, message: string): never {
  throw new Error(`${scope.label}: ${message}`);
}

export function numberOf(scope: Scope, value: Scalar, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(scope, `${what} needs a number`);
  }
  return value;
}
