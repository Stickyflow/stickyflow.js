import type { BlockKind, SflBinding, SflBlock, SflDocument } from '../sflLanguage/ast';
import { collectContracts } from './contract';
import { collectRefs, inferType, type TypeScope } from './expression';
import { BINDABLE_PROPERTIES } from './targets';
import { type BindingDiagnostic, type BindingType, type BoundProperty, type DataSourceContract, sameType, typeName } from './types';

export interface BindingGraph {
  contracts: Map<string, DataSourceContract>;
  bindings: BoundProperty[];
  // "source.field" -> the bindings that read it; a source change only touches these.
  byField: Map<string, BoundProperty[]>;
  diagnostics: BindingDiagnostic[];
}

interface BindingSite {
  kind: BlockKind;
  path: string[];
  binding: SflBinding;
}

// Bindings sit where the property sits: on a block, in its data block (charts), or on a series.
function collectSites(blocks: SflBlock[], chartPath: string[], sites: BindingSite[]): void {
  for (const block of blocks) {
    const path = block.kind === 'Series' ? [...chartPath, block.name] : [block.name];
    const ownChart = block.kind === 'Chart' ? [block.name] : chartPath;
    for (const entry of block.entries) {
      if (entry.type === 'binding') {
        sites.push({ kind: block.kind, path, binding: entry.binding });
      } else if (entry.type === 'block') {
        collectSites([entry.block], ownChart, sites);
      } else if (entry.type === 'data') {
        for (const inner of entry.data.entries) {
          if (inner.type === 'binding') {
            sites.push({ kind: 'Chart', path: ownChart, binding: inner.binding });
          } else if (inner.type === 'block') {
            collectSites([inner.block], ownChart, sites);
          }
        }
      }
    }
  }
}

function fieldType(contract: DataSourceContract, field: string): BindingType | undefined {
  const type = contract.fields[field];
  if (!type) {
    return undefined;
  }
  return contract.mode === 'table' ? { list: type } : type;
}

function createScope(contracts: Map<string, DataSourceContract>): TypeScope {
  return {
    resolve(path) {
      const contract = path.length === 2 ? contracts.get(path[0]) : undefined;
      return contract ? fieldType(contract, path[1]) : undefined;
    },
  };
}

export function buildBindingGraph(sflDocument: SflDocument): BindingGraph {
  const { contracts, diagnostics } = collectContracts(sflDocument);
  const scope = createScope(contracts);
  const bindings: BoundProperty[] = [];
  const sites: BindingSite[] = [];
  collectSites(sflDocument.blocks, [], sites);

  for (const { kind, path, binding } of sites) {
    const owner = path.join('.');
    const report = (code: string, message: string, severity: 'error' | 'warning' = 'error') =>
      diagnostics.push({ severity, code, message, line: binding.line, col: binding.col });
    if (binding.operator !== '<-') {
      report(
        'binding-operator-unsupported',
        `'${binding.operator}' on '${binding.key}' is parsed but not executed yet; only '<-' is supported.`,
        'warning',
      );
      continue;
    }
    const expected = BINDABLE_PROPERTIES[kind]?.[binding.key];
    if (!expected) {
      const allowed = Object.keys(BINDABLE_PROPERTIES[kind] ?? {});
      report(
        'unknown-bound-property',
        `${kind} '${owner}' has no bindable property '${binding.key}'${allowed.length ? ` (bindable: ${allowed.join(', ')})` : ''}.`,
      );
      continue;
    }
    const actual = inferType(binding.expr, scope, report);
    if (!actual) {
      continue;
    }
    if (!sameType(actual, expected)) {
      report('type-mismatch', `'${binding.key}' expects ${typeName(expected)}, the expression is ${typeName(actual)}.`);
      continue;
    }
    const dependencies = [...new Set(collectRefs(binding.expr).map(ref => ref.join('.')))];
    bindings.push({
      id: `${kind}.${owner}.${binding.key}`,
      ownerKind: kind,
      ownerPath: path,
      property: binding.key,
      operator: binding.operator,
      expr: binding.expr,
      type: expected,
      dependencies,
      line: binding.line,
      col: binding.col,
    });
  }

  const byField = new Map<string, BoundProperty[]>();
  for (const binding of bindings) {
    for (const dependency of binding.dependencies) {
      byField.set(dependency, [...(byField.get(dependency) ?? []), binding]);
    }
  }
  return { contracts, bindings, byField, diagnostics };
}
