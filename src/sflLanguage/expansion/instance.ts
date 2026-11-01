import type { SflBinding, SflBlock, SflEntry, SflExpr, SflProperty } from '../ast';
import { resolveValue } from './evaluation';
import type { Scope } from './scope';

// A binding is worked out when the data comes, but the names of a cell or the Parameters are already known here.
function knownNames(scope: Scope, expr: SflExpr): SflExpr {
  switch (expr.kind) {
    case 'ref': {
      const value =
        expr.path.length === 1 ? (scope.vars.get(expr.path[0]) ?? scope.params.get(expr.path[0])) : undefined;
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

function propertiesOf(scope: Scope, properties: SflProperty[]): SflProperty[] {
  return properties.map(property => ({ key: property.key, value: resolveValue(scope, property.value) }));
}

function entryOf(scope: Scope, entry: SflEntry, rename: (name: string) => string): SflEntry {
  switch (entry.type) {
    case 'property':
      return {
        type: 'property',
        property: { key: entry.property.key, value: resolveValue(scope, entry.property.value) },
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
    case 'block':
      return { type: 'block', block: instance(scope, entry.block, rename) };
    default:
      return entry;
  }
}

// A copy of a block with its computed values worked out and its name, and the names of the blocks in it, changed by `rename`.
export function instance(scope: Scope, block: SflBlock, rename: (name: string) => string): SflBlock {
  return {
    ...block,
    name: rename(block.name),
    entries: block.entries.map(entry => entryOf(scope, entry, rename)),
  };
}
