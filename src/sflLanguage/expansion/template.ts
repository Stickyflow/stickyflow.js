import type { SflBlock, SflEntry } from '../ast';
import { fail, instance, numbersOf, Random, resolveValue, type Scope } from './repeat';

// A `Template` describes blocks once, and every `Use` of it makes them again at another place, with values of its own. This step turns every
// Use into those plain blocks and takes the Templates out, so the rest of the package never sees either. The source text is not touched.

const MAX_DEPTH = 4;
const MAX_BLOCKS = 100_000;

// What a Use reads for itself. Any other property of it gives a value to the parameter of the Template that has its name.
const OWN = new Set(['at', 'seed']);
// Names a Template cannot give to a parameter, as the Use puts its place in them.
const PLACE = new Set(['x', 'y']);

function hashOf(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
  }
  return hash >>> 0;
}

function collect(blocks: SflBlock[], into: Map<string, SflBlock>): void {
  for (const block of blocks) {
    if (block.kind === 'Template') {
      if (into.has(block.name)) {
        throw new Error(`Template ${block.name}: there is another Template of this name`);
      }
      if (block.entries.some(entry => entry.type === 'block' && entry.block.kind === 'Repeat')) {
        throw new Error(`Template ${block.name}: a Template cannot hold a Repeat, a Repeat can hold a Use`);
      }
      into.set(block.name, block);
    }
    collect(
      block.entries.flatMap(entry => (entry.type === 'block' ? [entry.block] : [])),
      into,
    );
  }
}

interface Budget {
  blocks: number;
}

function expandUse(use: SflBlock, templates: Map<string, SflBlock>, depth: number, budget: Budget): SflBlock[] {
  const scope: Scope = { vars: new Map(), random: new Random(0), label: `Use ${use.name}`, substitute: true };
  if (depth > MAX_DEPTH) {
    fail(scope, `Templates are nested more than ${MAX_DEPTH} deep, which may be a Template that uses itself`);
  }
  if (use.composition.length !== 1) {
    fail(scope, 'a Use names one Template, as in Use oak : tree');
  }
  const template = templates.get(use.composition[0]);
  if (!template) {
    fail(scope, `there is no Template ${use.composition[0]}`);
  }

  const seed = numbersOf(use, 'seed')?.[0] ?? 0;
  scope.random = new Random(Math.imul(seed + 1, 0x9e3779b1) ^ hashOf(use.name));
  const [x = 0, y = 0] = numbersOf(use, 'at') ?? [];
  scope.vars.set('x', x);
  scope.vars.set('y', y);

  const given = new Map(
    use.entries.flatMap(entry =>
      entry.type === 'property' && !OWN.has(entry.property.key)
        ? [[entry.property.key, entry.property.value] as const]
        : [],
    ),
  );
  for (const entry of template.entries) {
    if (entry.type !== 'property') {
      continue;
    }
    const { key, value } = entry.property;
    if (PLACE.has(key) || OWN.has(key)) {
      fail(scope, `${key} is the name of something a Use sets, so it cannot be a parameter`);
    }
    const chosen = resolveValue(scope, given.get(key) ?? value);
    given.delete(key);
    if (chosen.type === 'number' || chosen.type === 'string') {
      scope.vars.set(key, chosen.value);
    } else if (chosen.type === 'ident') {
      scope.vars.set(
        key,
        chosen.segments[0] === 'true' ? 1 : chosen.segments[0] === 'false' ? 0 : chosen.segments.join('.'),
      );
    } else {
      fail(scope, `${key} needs a number, a text or a name`);
    }
  }
  const unknown = [...given.keys()][0];
  if (unknown !== undefined) {
    fail(scope, `Template ${template.name} has no parameter ${unknown}`);
  }

  const made = template.entries.flatMap(entry =>
    entry.type === 'block' ? [instance(scope, entry.block, name => `${use.name}_${name}`)] : [],
  );
  budget.blocks += made.length;
  if (budget.blocks > MAX_BLOCKS) {
    fail(scope, 'too many blocks');
  }
  return expandIn(made, templates, depth + 1, budget);
}

function expandIn(blocks: SflBlock[], templates: Map<string, SflBlock>, depth: number, budget: Budget): SflBlock[] {
  return blocks.flatMap(block => {
    if (block.kind === 'Template') {
      return [];
    }
    if (block.kind === 'Use') {
      return expandUse(block, templates, depth, budget);
    }
    if (!block.entries.some(entry => entry.type === 'block')) {
      return [block];
    }
    return [
      {
        ...block,
        entries: block.entries.flatMap((entry): SflEntry[] =>
          entry.type === 'block'
            ? expandIn([entry.block], templates, depth, budget).map(child => ({ type: 'block' as const, block: child }))
            : [entry],
        ),
      },
    ];
  });
}

export function hasTemplates(blocks: SflBlock[]): boolean {
  return blocks.some(
    block =>
      block.kind === 'Template' ||
      block.kind === 'Use' ||
      block.entries.some(entry => entry.type === 'block' && hasTemplates([entry.block])),
  );
}

// The blocks with every Use replaced by what its Template makes, and the Templates taken out.
export function expandUses(blocks: SflBlock[]): SflBlock[] {
  const templates = new Map<string, SflBlock>();
  collect(blocks, templates);
  return expandIn(blocks, templates, 0, { blocks: 0 });
}
