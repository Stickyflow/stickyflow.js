import type { BindingOperator, SflBlock, SflDocument } from '../sflLanguage/ast';
import { collectContracts, visitBlocks } from './contract';
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

function bindingsOf(block: SflBlock): Array<{ operator: BindingOperator; key: string; expr: import('../sflLanguage/ast').SflExpr; line: number; col: number }> {
  return block.entries.flatMap(entry => (entry.type === 'binding' ? [entry.binding] : []));
}

export function buildBindingGraph(sflDocument: SflDocument): BindingGraph {
  const { contracts, diagnostics } = collectContracts(sflDocument);
  const scope = createScope(contracts);
  const bindings: BoundProperty[] = [];

  visitBlocks(sflDocument.blocks, block => {
    for (const binding of bindingsOf(block)) {
      const report = (code: string, message: string) =>
        diagnostics.push({ severity: 'error', code, message, line: binding.line, col: binding.col });
      if (binding.operator !== '<-') {
        diagnostics.push({
          severity: 'warning',
          code: 'binding-operator-unsupported',
          message: `'${binding.operator}' on '${binding.key}' is parsed but not executed yet; only '<-' is supported.`,
          line: binding.line,
          col: binding.col,
        });
        continue;
      }
      const expected = BINDABLE_PROPERTIES[block.kind]?.[binding.key];
      if (!expected) {
        const allowed = Object.keys(BINDABLE_PROPERTIES[block.kind] ?? {});
        report(
          'unknown-bound-property',
          `${block.kind} '${block.name}' has no bindable property '${binding.key}'${allowed.length ? ` (bindable: ${allowed.join(', ')})` : ''}.`,
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
      bindings.push({
        id: `${block.kind}.${block.name}.${binding.key}`,
        ownerKind: block.kind,
        ownerName: block.name,
        property: binding.key,
        operator: binding.operator,
        expr: binding.expr,
        type: expected,
        dependencies: [...new Set(collectRefs(binding.expr).map(path => path.join('.')))],
        line: binding.line,
        col: binding.col,
      });
    }
  });

  const byField = new Map<string, BoundProperty[]>();
  for (const binding of bindings) {
    for (const dependency of binding.dependencies) {
      byField.set(dependency, [...(byField.get(dependency) ?? []), binding]);
    }
  }
  return { contracts, bindings, byField, diagnostics };
}
