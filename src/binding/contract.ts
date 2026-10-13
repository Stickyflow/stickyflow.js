import type { SflBlock, SflDocument, SflProperty } from '../sflLanguage/ast';
import { type BindingDiagnostic, type DataSourceContract, isScalarType, type SourceMode } from './types';

function propertyValue(properties: SflProperty[], key: string): string | undefined {
  const value = properties.find(property => property.key === key)?.value;
  return value?.type === 'ident' ? value.segments.join('.') : undefined;
}

function readContract(block: SflBlock, diagnostics: BindingDiagnostic[]): DataSourceContract {
  const properties = block.entries.flatMap(entry => (entry.type === 'property' ? [entry.property] : []));
  const mode: SourceMode = propertyValue(properties, 'mode') === 'record' ? 'record' : 'table';
  const contract: DataSourceContract = { name: block.name, mode, fields: {} };
  for (const entry of block.entries) {
    if (entry.type !== 'fields') {
      continue;
    }
    for (const field of entry.fields) {
      const type = field.value.type === 'ident' ? field.value.segments.join('.') : '';
      if (isScalarType(type)) {
        contract.fields[field.key] = type;
      } else {
        diagnostics.push({
          severity: 'error',
          code: 'unknown-field-type',
          message: `Field '${block.name}.${field.key}' has unknown type '${type}' (use number, string or boolean).`,
          line: 0,
          col: 0,
        });
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
