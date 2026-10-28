import type { SflBlock, SflDocument, SflEntry, SflExpr, SflProperty, SflValue } from '../ast';

// A `Repeat` block puts the blocks in it on a grid, once for every cell. This step turns it into those plain blocks, so the rest of the
// package never sees a Repeat. The source text is not touched: the parser and the emitter keep the Repeat as it was written.

// What a Repeat reads for itself. Any other computed property of it is a name the blocks in it can use, like a height worked out once.
const RESERVED = new Set(['columns', 'rows', 'count', 'step', 'origin', 'seed', 'jitter', 'chance', 'order', 'where']);

const MAX_CELLS = 20_000;
const MAX_VALUES = 1_000_000;

type Scalar = number | string | boolean;

class Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  // mulberry32: a small generator that gives the same numbers for the same seed, on every machine.
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

interface Scope {
  vars: Map<string, Scalar>;
  random: Random;
  repeat: string;
}

function fail(scope: Scope, message: string): never {
  throw new Error(`Repeat ${scope.repeat}: ${message}`);
}

function numberOf(scope: Scope, value: Scalar, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(scope, `${what} needs a number`);
  }
  return value;
}

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

function callFunction(scope: Scope, name: string, args: Scalar[]): Scalar {
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

function evaluate(scope: Scope, expr: SflExpr): Scalar {
  switch (expr.kind) {
    case 'number':
    case 'string':
    case 'boolean':
      return expr.value;
    case 'ref': {
      const name = expr.path.join('.');
      const value = scope.vars.get(name);
      if (value === undefined) {
        fail(scope, `unknown name ${name}`);
      }
      return value;
    }
    case 'unary': {
      const operand = evaluate(scope, expr.operand);
      return expr.operator === '-' ? -numberOf(scope, operand, 'a minus') : !operand;
    }
    case 'call':
      return callFunction(
        scope,
        expr.callee.join('.'),
        expr.args.map(arg => evaluate(scope, arg)),
      );
    case 'binary': {
      const left = evaluate(scope, expr.left);
      const right = evaluate(scope, expr.right);
      switch (expr.operator) {
        case '+':
          return typeof left === 'string' || typeof right === 'string'
            ? `${left}${right}`
            : numberOf(scope, left, '+') + numberOf(scope, right, '+');
        case '-':
          return numberOf(scope, left, '-') - numberOf(scope, right, '-');
        case '*':
          return numberOf(scope, left, '*') * numberOf(scope, right, '*');
        case '/':
          return numberOf(scope, left, '/') / numberOf(scope, right, '/');
        case '>':
          return numberOf(scope, left, '>') > numberOf(scope, right, '>');
        case '<':
          return numberOf(scope, left, '<') < numberOf(scope, right, '<');
        case '>=':
          return numberOf(scope, left, '>=') >= numberOf(scope, right, '>=');
        case '<=':
          return numberOf(scope, left, '<=') <= numberOf(scope, right, '<=');
        case '==':
          return left === right;
        case '!=':
          return left !== right;
        case '&&':
          return Boolean(left) && Boolean(right);
        case '||':
          return Boolean(left) || Boolean(right);
      }
    }
  }
}

const round = (value: number) => Math.round(value * 1000) / 1000;

function resolveValue(scope: Scope, value: SflValue): SflValue {
  if (value.type !== 'expr') {
    return value;
  }
  const results = value.items.map(item => evaluate(scope, item));
  if (results.length === 1) {
    const [only] = results;
    if (typeof only === 'number') {
      return { type: 'number', value: round(numberOf(scope, only, 'a value')) };
    }
    if (typeof only === 'string') {
      return { type: 'string', value: only };
    }
    return { type: 'ident', segments: [String(only)] };
  }
  return { type: 'tuple', values: results.map(result => round(numberOf(scope, result, 'a tuple'))) };
}

function propertiesOf(scope: Scope, properties: SflProperty[]): SflProperty[] {
  return properties.map(property => ({ key: property.key, value: resolveValue(scope, property.value) }));
}

function entryOf(scope: Scope, entry: SflEntry, suffix: string): SflEntry {
  switch (entry.type) {
    case 'property':
      return {
        type: 'property',
        property: { key: entry.property.key, value: resolveValue(scope, entry.property.value) },
      };
    case 'layout':
      return { type: 'layout', layout: { properties: propertiesOf(scope, entry.layout.properties) } };
    case 'style':
      return { type: 'style', style: { ...entry.style, properties: propertiesOf(scope, entry.style.properties) } };
    case 'block':
      return { type: 'block', block: instance(scope, entry.block, suffix) };
    default:
      return entry;
  }
}

function instance(scope: Scope, block: SflBlock, suffix: string): SflBlock {
  return {
    ...block,
    name: `${block.name}${suffix}`,
    entries: block.entries.map(entry => entryOf(scope, entry, suffix)),
  };
}

function propertyOf(block: SflBlock, key: string): SflValue | undefined {
  for (const entry of block.entries) {
    if (entry.type === 'property' && entry.property.key === key) {
      return entry.property.value;
    }
  }
  return undefined;
}

function numbersOf(block: SflBlock, key: string): number[] | undefined {
  for (const entry of block.entries) {
    if (entry.type === 'property' && entry.property.key === key) {
      const value = entry.property.value;
      if (value.type === 'number') {
        return [value.value];
      }
      if (value.type === 'tuple') {
        return value.values;
      }
    }
  }
  return undefined;
}

function expandRepeat(block: SflBlock): SflBlock[] {
  const scope: Scope = { vars: new Map(), random: new Random(0), repeat: block.name };
  const count = numbersOf(block, 'count')?.[0];
  const columns = Math.max(1, Math.floor(count ?? numbersOf(block, 'columns')?.[0] ?? 1));
  const rows = count === undefined ? Math.max(1, Math.floor(numbersOf(block, 'rows')?.[0] ?? 1)) : 1;
  const total = columns * rows;
  if (total > MAX_CELLS) {
    fail(scope, `${total} cells are too many, the limit is ${MAX_CELLS}`);
  }
  const [stepX = 0, stepY = stepX] = numbersOf(block, 'step') ?? [];
  const [originX = 0, originY = 0] = numbersOf(block, 'origin') ?? [];
  const seed = numbersOf(block, 'seed')?.[0] ?? 0;
  const jitter = numbersOf(block, 'jitter')?.[0] ?? 0;
  const chance = numbersOf(block, 'chance')?.[0] ?? 1;
  const diagonal =
    propertyOf(block, 'order')?.type === 'ident' &&
    (propertyOf(block, 'order') as { segments: string[] }).segments[0] === 'diagonal';
  const condition = propertyOf(block, 'where');
  const helpers = block.entries.flatMap(entry =>
    entry.type === 'property' && entry.property.value.type === 'expr' && !RESERVED.has(entry.property.key)
      ? [entry.property]
      : [],
  );
  const templates = block.entries.flatMap(entry => (entry.type === 'block' ? [entry.block] : []));
  if (templates.some(template => template.kind === 'Repeat')) {
    fail(scope, 'a Repeat cannot hold another Repeat');
  }
  if (total * Math.max(1, templates.length) > MAX_VALUES) {
    fail(scope, 'too many blocks');
  }

  // With order: diagonal the cells are made from the back to the front of an isometric scene, so what is nearer covers what is behind.
  const cells: Array<[number, number]> = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      cells.push([col, row]);
    }
  }
  if (diagonal) {
    cells.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
  }

  const out: SflBlock[] = [];
  for (const [col, row] of cells) {
    {
      const index = row * columns + col;
      scope.random = new Random(Math.imul(seed + 1, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b));
      if (chance < 1 && scope.random.next() >= chance) {
        continue;
      }
      const spread = () => (jitter > 0 ? (scope.random.next() * 2 - 1) * jitter : 0);
      scope.vars = new Map<string, Scalar>([
        ['col', col],
        ['row', row],
        ['index', index],
        ['count', total],
        ['columns', columns],
        ['rows', rows],
        ['x', round(originX + col * stepX + spread())],
        ['y', round(originY + row * stepY + spread())],
      ]);
      for (const helper of helpers) {
        const value = resolveValue(scope, helper.value);
        if (value.type === 'number' || value.type === 'string') {
          scope.vars.set(helper.key, value.value);
        } else if (value.type === 'ident') {
          scope.vars.set(helper.key, value.segments[0] === 'true' ? 1 : 0);
        } else {
          fail(scope, `${helper.key} needs a number`);
        }
      }
      if (condition && condition.type === 'expr') {
        const result = condition.items.map(item => evaluate(scope, item))[0];
        if (!result) {
          continue;
        }
      }
      const suffix = rows === 1 ? `_${col}` : `_${col}_${row}`;
      for (const template of templates) {
        out.push(instance(scope, template, suffix));
      }
    }
  }
  return out;
}

function expandBlocks(blocks: SflBlock[]): SflBlock[] {
  return blocks.flatMap(block => {
    if (block.kind === 'Repeat') {
      return expandRepeat(block);
    }
    if (!block.entries.some(entry => entry.type === 'block')) {
      return [block];
    }
    return [
      {
        ...block,
        entries: block.entries.flatMap((entry): SflEntry[] =>
          entry.type === 'block'
            ? (entry.block.kind === 'Repeat' ? expandRepeat(entry.block) : expandBlocks([entry.block])).map(child => ({
                type: 'block' as const,
                block: child,
              }))
            : [entry],
        ),
      },
    ];
  });
}

function checkNoComputed(blocks: SflBlock[]): void {
  for (const block of blocks) {
    for (const entry of block.entries) {
      const properties =
        entry.type === 'property'
          ? [entry.property]
          : entry.type === 'layout'
            ? entry.layout.properties
            : entry.type === 'style'
              ? entry.style.properties
              : [];
      for (const property of properties) {
        if (property.value.type === 'expr') {
          throw new Error(
            `${block.kind} ${block.name}: ${property.key} is computed, and only a Repeat can work out a computed value`,
          );
        }
      }
      if (entry.type === 'block') {
        checkNoComputed([entry.block]);
      }
    }
  }
}

// A document in which every Repeat is replaced by the blocks it makes. A document without a Repeat is returned as it is.
export function expandRepeats(doc: SflDocument): SflDocument {
  const has = (blocks: SflBlock[]): boolean =>
    blocks.some(
      block =>
        block.kind === 'Repeat' || block.entries.some(entry => (entry.type === 'block' ? has([entry.block]) : false)),
    );
  if (!has(doc.blocks)) {
    checkNoComputed(doc.blocks);
    return doc;
  }
  const expanded = { ...doc, blocks: expandBlocks(doc.blocks) };
  checkNoComputed(expanded.blocks);
  return expanded;
}
