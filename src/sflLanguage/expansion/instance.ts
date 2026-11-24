import type { SflBinding, SflBlock, SflEntry, SflExpr, SflHandler, SflProperty, SflValue } from '../ast';
import { resolveValue } from './evaluation';
import type { Scope } from './scope';

// A binding is worked out when the data comes, but the names of a cell or the Parameters are already known here.
function knownNames(scope: Scope, expr: SflExpr): SflExpr {
  switch (expr.kind) {
    case 'ref': {
      // A field of the row a Repeat is at, as house.name, is a name of the cell as well.
      const value =
        expr.path.length === 1
          ? (scope.vars.get(expr.path[0]) ?? scope.params.get(expr.path[0]))
          : scope.vars.get(expr.path.join('.'));
      if (typeof value === 'number') {
        return { kind: 'number', value };
      }
      if (typeof value === 'string') {
        return { kind: 'string', value };
      }
      return typeof value === 'boolean' ? { kind: 'boolean', value } : expr;
    }
    case 'unary':
      return { ...expr, operand: knownNames(scope, expr.operand) };
    case 'binary':
      return { ...expr, left: knownNames(scope, expr.left), right: knownNames(scope, expr.right) };
    case 'call':
      return { ...expr, args: expr.args.map(arg => knownNames(scope, arg)) };
    default:
      return expr;
  }
}

function bindingOf(scope: Scope, binding: SflBinding): SflBinding {
  return { ...binding, expr: knownNames(scope, binding.expr) };
}

// What a handler writes can name the cell it stands in, so each copy writes its own values.
function handlerOf(scope: Scope, handler: SflHandler): SflHandler {
  return {
    ...handler,
    assignments: handler.assignments.map(assignment => ({ ...assignment, expr: knownNames(scope, assignment.expr) })),
  };
}

function propertiesOf(scope: Scope, properties: SflProperty[]): SflProperty[] {
  return properties.map(property => ({ key: property.key, value: resolveValue(scope, property.value) }));
}

// The properties that name another block. A copy that holds the block named takes its new name along.
const REFERENCES = new Set(['sketch', 'anchor', 'picture']);

function referenceOf(
  key: string,
  value: SflValue,
  rename: (name: string) => string,
  local: ReadonlySet<string>,
): SflValue {
  const [first, ...rest] = value.type === 'ident' || value.type === 'endpoint' ? value.segments : [];
  if (first === undefined || !local.has(first)) {
    return value;
  }
  if (value.type === 'endpoint') {
    return { ...value, segments: [rename(first), ...rest] };
  }
  return value.type === 'ident' && REFERENCES.has(key) && rest.length === 0
    ? { ...value, segments: [rename(first)] }
    : value;
}

function entryOf(
  scope: Scope,
  entry: SflEntry,
  rename: (name: string) => string,
  local: ReadonlySet<string>,
): SflEntry {
  switch (entry.type) {
    case 'property':
      return {
        type: 'property',
        property: {
          key: entry.property.key,
          value: referenceOf(entry.property.key, resolveValue(scope, entry.property.value), rename, local),
        },
      };
    case 'layout':
      return {
        type: 'layout',
        layout: {
          properties: propertiesOf(scope, entry.layout.properties),
          ...(entry.layout.bindings
            ? { bindings: entry.layout.bindings.map(binding => bindingOf(scope, binding)) }
            : {}),
        },
      };
    case 'style':
      return {
        type: 'style',
        style: {
          ...entry.style,
          properties: propertiesOf(scope, entry.style.properties),
          ...(entry.style.bindings ? { bindings: entry.style.bindings.map(binding => bindingOf(scope, binding)) } : {}),
        },
      };
    case 'binding':
      return { type: 'binding', binding: bindingOf(scope, entry.binding) };
    case 'handler':
      return { type: 'handler', handler: handlerOf(scope, entry.handler) };
    case 'block':
      return { type: 'block', block: instance(scope, entry.block, rename, local) };
    default:
      return entry;
  }
}

// A copy of a block with its computed values worked out and its name, and the names of the blocks in it, changed by `rename`. A
// reference to one of the `local` blocks, those the same copy makes, is renamed with it, so it points into this copy.
export function instance(
  scope: Scope,
  block: SflBlock,
  rename: (name: string) => string,
  local: ReadonlySet<string> = new Set(),
): SflBlock {
  return {
    ...block,
    name: rename(block.name),
    entries: block.entries.map(entry => entryOf(scope, entry, rename, local)),
  };
}

// The names of these blocks and of every block in them: what one copy of a Template or of a cell makes.
export function namesIn(blocks: SflBlock[]): Set<string> {
  const names = new Set<string>();
  const visit = (block: SflBlock) => {
    if (block.name) {
      names.add(block.name);
    }
    for (const entry of block.entries) {
      if (entry.type === 'block') {
        visit(entry.block);
      }
    }
  };
  blocks.forEach(visit);
  return names;
}
