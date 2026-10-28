import { fail, numberOf, type Scalar, type Scope } from './scope';

// The functions that the computed values of a Repeat and of a Template can call.
function rgbOf(scope: Scope, value: Scalar): [number, number, number] {
  const match = typeof value === 'string' ? /^#([0-9a-f]{6})$/i.exec(value) : null;
  if (!match) {
    fail(scope, 'a color has to be written as "#rrggbb"');
  }
  const n = Number.parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const hexOf = (rgb: number[]): string =>
  `#${rgb
    .map(channel =>
      Math.round(Math.max(0, Math.min(255, channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

export function callFunction(scope: Scope, name: string, args: Scalar[]): Scalar {
  const number = (index: number) => numberOf(scope, args[index], `${name}()`);
  switch (name) {
    case 'random': {
      if (args.length === 0) {
        return scope.random.next();
      }
      const low = args.length === 1 ? 0 : number(0);
      const high = args.length === 1 ? number(0) : number(1);
      return low + scope.random.next() * (high - low);
    }
    case 'pick': {
      if (args.length === 0) {
        fail(scope, 'pick() needs at least one value');
      }
      return args[Math.floor(scope.random.next() * args.length)];
    }
    case 'exp':
      return Math.exp(number(0));
    case 'pow':
      return number(0) ** number(1);
    case 'dist':
      return Math.hypot(number(0) - number(2), number(1) - number(3));
    case 'mix': {
      const from = rgbOf(scope, args[0]);
      const to = rgbOf(scope, args[1]);
      const amount = Math.max(0, Math.min(1, number(2)));
      return hexOf(from.map((channel, index) => channel + (to[index] - channel) * amount));
    }
    case 'shade': {
      const factor = number(1);
      return hexOf(rgbOf(scope, args[0]).map(channel => channel * factor));
    }
    case 'floor':
      return Math.floor(number(0));
    case 'ceil':
      return Math.ceil(number(0));
    case 'round':
      return Math.round(number(0));
    case 'abs':
      return Math.abs(number(0));
    case 'sqrt':
      return Math.sqrt(number(0));
    case 'sin':
      return Math.sin(number(0));
    case 'cos':
      return Math.cos(number(0));
    case 'min':
      return Math.min(...args.map((_, index) => number(index)));
    case 'max':
      return Math.max(...args.map((_, index) => number(index)));
    case 'when':
      return args[0] ? args[1] : args[2];
    default:
      return fail(scope, `unknown function ${name}()`);
  }
}
