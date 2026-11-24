import type { SflBlock, SflEntry, SflNote, SflProperty, SflValue } from '../ast';
import { evaluate, resolveValue, round } from './evaluation';
import { instance, namesIn } from './instance';
import { placedWithin, placementOf } from './placement';
import { numbersOf, propertyOf } from './properties';
import { Random } from './random';
import { fail, type Scalar, type Scope, type Tables } from './scope';

// A `Repeat` block puts the blocks in it on a grid, once for every cell. This step turns it into those plain blocks, so the rest of the
// package never sees a Repeat. The source text is not touched: the parser and the emitter keep the Repeat as it was written.

// What a Repeat reads for itself. Any other computed property of it is a name the blocks in it can use, like a height worked out once.
const RESERVED = new Set([
  'columns',
  'rows',
  'count',
  'each',
  'step',
  'origin',
  'seed',
  'jitter',
  'chance',
  'order',
  'sequence',
  'where',
]);
// The names every cell has, which a row cannot be called.
const CELL_NAMES = new Set(['col', 'row', 'index', 'count', 'columns', 'rows', 'x', 'y', 'z']);

// What the document says about its data, for a Repeat that runs over a table.
export interface RepeatData {
  // The rows the host holds now. A table without rows makes nothing.
  tables: Tables;
  // Every DataSource of the document, and whether it is a record.
  sources: ReadonlyMap<string, 'record' | 'table'>;
}

const NO_DATA: RepeatData = { tables: new Map(), sources: new Map() };

const MAX_CELLS = 20_000;
const MAX_VALUES = 1_000_000;

interface Grid {
  columns: number;
  rows: number;
  step: [number, number];
  origin: [number, number];
  seed: number;
  jitter: number;
  chance: number;
  diagonal: boolean;
  condition: SflValue | undefined;
  helpers: SflProperty[];
  templates: SflBlock[];
  // The rows a Repeat with `each` runs over, and the name each of them is called by.
  each?: { row: string; rows: ReadonlyArray<Readonly<Record<string, unknown>>> };
}

// `each: house in city`: the rows of the table, one cell for each. The names are checked, so a field of a row can never be
// taken for a parameter, a name of the cell or a column of the table.
function readEach(block: SflBlock, scope: Scope, data: RepeatData): Grid['each'] {
  const each = propertyOf(block, 'each');
  if (!each) {
    return undefined;
  }
  if (each.type !== 'each') {
    fail(scope, "each is written as 'each: row in table'");
  }
  if (['columns', 'rows', 'count'].some(key => propertyOf(block, key))) {
    fail(scope, 'each makes one cell for every row, so columns, rows and count cannot stand beside it');
  }
  const kind = data.sources.get(each.source);
  if (!kind) {
    fail(scope, `each names ${each.source}, which is not a DataSource of this document`);
  }
  if (kind === 'record') {
    fail(scope, `${each.source} is a record and has no rows to run over`);
  }
  if (CELL_NAMES.has(each.row) || scope.params.has(each.row) || data.sources.has(each.row)) {
    fail(scope, `a row cannot be called ${each.row}, as that name is taken`);
  }
  return { row: each.row, rows: data.tables.get(each.source) ?? [] };
}

function readGrid(block: SflBlock, scope: Scope, data: RepeatData): Grid {
  const each = readEach(block, scope, data);
  const count = each ? each.rows.length : numbersOf(scope, block, 'count')?.[0];
  const columns = each
    ? each.rows.length
    : Math.max(1, Math.floor(count ?? numbersOf(scope, block, 'columns')?.[0] ?? 1));
  const rows = count === undefined ? Math.max(1, Math.floor(numbersOf(scope, block, 'rows')?.[0] ?? 1)) : 1;
  if (columns * rows > MAX_CELLS) {
    fail(scope, `${columns * rows} cells are too many, the limit is ${MAX_CELLS}`);
  }
  const [stepX = 0, stepY = stepX] = numbersOf(scope, block, 'step') ?? [];
  const [originX = 0, originY = 0] = numbersOf(scope, block, 'origin') ?? [];
  // `sequence: diagonal`, as `order: diagonal` was written before.
  const order = propertyOf(block, 'sequence') ?? propertyOf(block, 'order');
  const templates = block.entries.flatMap(entry => (entry.type === 'block' ? [entry.block] : []));
  if (templates.some(template => template.kind === 'Repeat')) {
    fail(scope, 'a Repeat cannot hold another Repeat');
  }
  if (columns * rows * Math.max(1, templates.length) > MAX_VALUES) {
    fail(scope, 'too many blocks');
  }
  return {
    columns,
    rows,
    step: [stepX, stepY],
    origin: [originX, originY],
    seed: numbersOf(scope, block, 'seed')?.[0] ?? 0,
    jitter: numbersOf(scope, block, 'jitter')?.[0] ?? 0,
    chance: numbersOf(scope, block, 'chance')?.[0] ?? 1,
    diagonal: order?.type === 'ident' && order.segments[0] === 'diagonal',
    condition: propertyOf(block, 'where'),
    helpers: helpersOf(block, scope, templates),
    templates,
    each,
  };
}

// How many letters one word must change to become the other.
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let corner = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, corner + (a[i - 1] === b[j - 1] ? 0 : 1));
      corner = above;
    }
  }
  return row[b.length];
}

// Every other property of a Repeat is a name its cells can use, a number written out as well as one worked out. One that no cell
// uses and that is nearly a word the Repeat reads is taken for a slip of the pen, as `colums: 5`.
function helpersOf(block: SflBlock, scope: Scope, templates: SflBlock[]): SflProperty[] {
  const used = JSON.stringify(templates);
  return block.entries.flatMap(entry => {
    if (entry.type !== 'property' || RESERVED.has(entry.property.key)) {
      return [];
    }
    const { key } = entry.property;
    const meant = [...RESERVED].find(word => distance(word, key) <= (word.length > 4 ? 2 : 1));
    if (meant && !used.includes(`"${key}"`)) {
      fail(scope, `${key} is not read by a Repeat, and no cell uses it: is it ${meant}?`);
    }
    return [entry.property];
  });
}

// With order: diagonal the cells are made from the back to the front of an isometric scene, so what is nearer covers what is behind.
function cellsOf(grid: Grid): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.columns; col++) {
      cells.push([col, row]);
    }
  }
  return grid.diagonal ? cells.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]) : cells;
}

// Gives the scope the random numbers and the names of one cell. A cell the chance leaves out gets none, and false is returned for it.
function enterCell(scope: Scope, grid: Grid, col: number, row: number): boolean {
  const index = row * grid.columns + col;
  scope.random = new Random(Math.imul(grid.seed + 1, 0x9e3779b1) ^ Math.imul(index + 1, 0x85ebca6b));
  if (grid.chance < 1 && scope.random.next() >= grid.chance) {
    return false;
  }
  const spread = () => (grid.jitter > 0 ? (scope.random.next() * 2 - 1) * grid.jitter : 0);
  scope.vars = new Map<string, Scalar>([
    ['col', col],
    ['row', row],
    ['index', index],
    ['count', grid.columns * grid.rows],
    ['columns', grid.columns],
    ['rows', grid.rows],
    ['x', round(grid.origin[0] + col * grid.step[0] + spread())],
    ['y', round(grid.origin[1] + row * grid.step[1] + spread())],
  ]);
  // In a Scene the rows lie along z, as y is up there. y keeps the same value, so a Repeat written before goes on as it was.
  scope.vars.set('z', scope.vars.get('y') as number);
  // The fields of the row this cell is made for, as house.name.
  for (const [field, value] of Object.entries(grid.each?.rows[index] ?? {})) {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      scope.vars.set(`${grid.each?.row}.${field}`, value);
    }
  }
  return true;
}

function nameHelpers(scope: Scope, helpers: SflProperty[]): void {
  for (const helper of helpers) {
    const value = resolveValue(scope, helper.value);
    if (value.type === 'number' || value.type === 'string') {
      scope.vars.set(helper.key, value.value);
    } else if (value.type === 'ident') {
      const [word] = value.segments;
      scope.vars.set(helper.key, word === 'true' ? 1 : word === 'false' ? 0 : value.segments.join('.'));
    } else {
      fail(scope, `${helper.key} needs a number`);
    }
  }
}

// `where` keeps a cell when it is true: worked out for the cell, or written out, as `where: false` while a Repeat is put aside.
function keepsCell(scope: Scope, condition: SflValue | undefined): boolean {
  if (condition === undefined) {
    return true;
  }
  if (condition.type === 'expr') {
    return Boolean(condition.items.map(item => evaluate(scope, item))[0]);
  }
  const value = resolveValue(scope, condition);
  if (value.type === 'number') {
    return value.value !== 0;
  }
  if (
    value.type === 'ident' &&
    value.segments.length === 1 &&
    (value.segments[0] === 'true' || value.segments[0] === 'false')
  ) {
    return value.segments[0] === 'true';
  }
  fail(scope, 'where needs true or false');
}

function expandRepeat(
  block: SflBlock,
  params: ReadonlyMap<string, Scalar>,
  data: RepeatData,
  inScene: boolean,
): SflBlock[] {
  const scope: Scope = { vars: new Map(), params, random: new Random(0), label: `Repeat ${block.name}` };
  // In a Scene its layout places all its cells together; elsewhere a Repeat has no place of its own.
  const placement = inScene ? placementOf(scope, block) : undefined;
  const grid = readGrid(block, scope, data);
  const made: SflBlock[] = [];
  const local = namesIn(grid.templates);
  for (const [col, row] of cellsOf(grid)) {
    if (!enterCell(scope, grid, col, row)) {
      continue;
    }
    nameHelpers(scope, grid.helpers);
    if (!keepsCell(scope, grid.condition)) {
      continue;
    }
    const suffix = grid.rows === 1 ? `_${col}` : `_${col}_${row}`;
    for (const template of grid.templates) {
      made.push(instance(scope, template, name => `${name}${suffix}`, local));
    }
  }
  return placedWithin(made, placement);
}

// The blocks with every Repeat replaced by the blocks it makes. What a Template holds is worked out by its Use, with its parameters.
export function expandRepeatBlocks(
  blocks: SflBlock[],
  params: ReadonlyMap<string, Scalar> = new Map(),
  data: RepeatData = NO_DATA,
  inScene = false,
): SflBlock[] {
  return blocks.flatMap(block => {
    if (block.kind === 'Repeat') {
      return expandRepeat(block, params, data, inScene);
    }
    if (block.kind === 'Template' || !block.entries.some(entry => entry.type === 'block')) {
      return [block];
    }
    return [
      {
        ...block,
        entries: block.entries.flatMap((entry): SflEntry[] =>
          entry.type === 'block'
            ? expandRepeatBlocks([entry.block], params, data, inScene || block.kind === 'Scene').map(child => ({
                type: 'block' as const,
                block: child,
              }))
            : [entry],
        ),
      },
    ];
  });
}

export function hasRepeats(blocks: SflBlock[]): boolean {
  return blocks.some(
    block =>
      block.kind === 'Repeat' || block.entries.some(entry => entry.type === 'block' && hasRepeats([entry.block])),
  );
}

// The tables the Repeats of these blocks run over, by name: when one of them gets other rows, the document is made again.
export function eachSources(blocks: SflBlock[]): Set<string> {
  const names = new Set<string>();
  const visit = (block: SflBlock) => {
    for (const entry of block.entries) {
      if (entry.type === 'block') {
        visit(entry.block);
      } else if (block.kind === 'Repeat' && entry.type === 'property' && entry.property.value.type === 'each') {
        names.add(entry.property.value.source);
      }
    }
  };
  blocks.forEach(visit);
  return names;
}

// What the diagnostics say about the Repeats as they are written: a word written as it was before, and y for a row in a Scene.
export function repeatNotes(blocks: SflBlock[], inScene = false): SflNote[] {
  return blocks.flatMap(block => {
    const own: SflNote[] = [];
    if (block.kind === 'Repeat') {
      if (propertyOf(block, 'order')) {
        own.push({
          code: 'repeat-order',
          owner: block.name,
          message: `Repeat '${block.name}': order is written sequence now, as order is the stacking of a layout. It is still read.`,
        });
      }
      const cells = JSON.stringify(block.entries.filter(entry => entry.type === 'block'));
      if (inScene && cells.includes('"path":["y"]')) {
        own.push({
          code: 'repeat-y-in-scene',
          owner: block.name,
          message: `Repeat '${block.name}' lies in a Scene, where y is up: its rows are named z there. y is still read.`,
        });
      }
    }
    const children = block.entries.flatMap(entry => (entry.type === 'block' ? [entry.block] : []));
    return [...own, ...repeatNotes(children, inScene || block.kind === 'Scene')];
  });
}
