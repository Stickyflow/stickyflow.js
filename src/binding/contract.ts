import type { SflBlock, SflDocument, SflValue } from '../sflLanguage/ast';
import { type BindingDiagnostic, type DataSourceContract, type SourceMode, scalarOf } from './types';

function identOf(value: SflValue | undefined): string | undefined {
  return value?.type === 'ident' ? value.segments.join('.') : undefined;
}

function readContract(block: SflBlock, diagnostics: BindingDiagnostic[]): DataSourceContract {
  const properties = block.entries.flatMap(entry => (entry.type === 'property' ? [entry.property] : []));
  const mode: SourceMode =
    identOf(properties.find(property => property.key === 'mode')?.value) === 'record' ? 'record' : 'table';
  const contract: DataSourceContract = { name: block.name, mode, fields: {}, declared: {} };
  for (const entry of block.entries) {
    if (entry.type === 'fields') {
      for (const field of entry.fields) {
        const declared = identOf(field.value) ?? '';
        const scalar = scalarOf(declared);
        if (scalar) {
          contract.fields[field.key] = scalar;
          contract.declared[field.key] = declared;
        } else {
          diagnostics.push({
            severity: 'error',
            code: 'unknown-field-type',
            message: `Field '${block.name}.${field.key}' has unknown type '${declared}' (use int, float, number, string or bool).`,
            line: 0,
            col: 0,
          });
        }
      }
    }
  }
  return contract;
}

export function visitBlocks(blocks: SflBlock[], visit: (block: SflBlock) => void): void {
  for (const block of blocks) {
    visit(block);
    visitBlocks(
      block.entries.flatMap(entry => (entry.type === 'block' ? [entry.block] : [])),
      visit,
    );
  }
}

export function collectContracts(sflDocument: SflDocument): {
  contracts: Map<string, DataSourceContract>;
  diagnostics: BindingDiagnostic[];
} {
  const contracts = new Map<string, DataSourceContract>();
  const diagnostics: BindingDiagnostic[] = [];
  visitBlocks(sflDocument.blocks, block => {
    if (block.kind !== 'DataSource') {
      return;
    }
    if (contracts.has(block.name)) {
      diagnostics.push({
        severity: 'error',
        code: 'duplicate-data-source',
        message: `DataSource '${block.name}' is declared more than once.`,
        line: 0,
        col: 0,
      });
      return;
    }
    contracts.set(block.name, readContract(block, diagnostics));
  });
  return { contracts, diagnostics };
}
