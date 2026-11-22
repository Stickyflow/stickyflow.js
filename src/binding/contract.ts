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
  const writable = properties.find(property => property.key === 'writable')?.value;
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
  if (writable) {
    contract.writable = writableFields(contract, writable, diagnostics);
  }
  return contract;
}

// `writable: [offset, gain]` names the fields that may be written, and `writable: []` none.
function writableFields(contract: DataSourceContract, value: SflValue, diagnostics: BindingDiagnostic[]): string[] {
  const report = (message: string) =>
    diagnostics.push({ severity: 'error', code: 'writable-list', message, line: 0, col: 0 });
  if (value.type !== 'list') {
    report(`'writable' of DataSource '${contract.name}' is a list of its fields, as in writable: [offset, gain].`);
    return [];
  }
  const names = value.values.map(identOf);
  for (const [index, name] of names.entries()) {
    if (name === undefined) {
      report(
        `'writable' of DataSource '${contract.name}' holds something that is not the name of a field, at place ${index + 1}.`,
      );
    } else if (!contract.fields[name]) {
      report(`'writable' of DataSource '${contract.name}' names '${name}', which is not one of its fields.`);
    }
  }
  return names.filter((name): name is string => name !== undefined);
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

// Each Parameters block, with the parameters that are plain numbers as its fields.
export function collectParameterContracts(sflDocument: SflDocument): DataSourceContract[] {
  const contracts: DataSourceContract[] = [];
  visitBlocks(sflDocument.blocks, block => {
    if (block.kind !== 'Parameters') {
      return;
    }
    const contract: DataSourceContract = { name: block.name, mode: 'record', fields: {}, declared: {}, parameters: {} };
    for (const entry of block.entries) {
      if (entry.type === 'property' && entry.property.value.type === 'number') {
        contract.fields[entry.property.key] = 'number';
        contract.declared[entry.property.key] = 'number';
        (contract.parameters as Record<string, number>)[entry.property.key] = entry.property.value.value;
      }
    }
    contracts.push(contract);
  });
  return contracts;
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
