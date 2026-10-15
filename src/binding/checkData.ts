import type { DataSource } from './dataSource';
import type { DataSourceContract, Row } from './types';

const typeOfValue = (value: unknown): string =>
  typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' ? typeof value : 'other';

export function checkData(contract: DataSourceContract, data: ReturnType<DataSource['get']>): string | null {
  const rows = Array.isArray(data) ? data : [data];
  if ((contract.mode === 'table') !== Array.isArray(data)) {
    return `DataSource '${contract.name}' is a ${contract.mode} source but delivered ${Array.isArray(data) ? 'rows' : 'a record'}.`;
  }
  for (const row of rows as Row[]) {
    for (const [field, type] of Object.entries(contract.fields)) {
      if (typeOfValue(row[field]) !== type) {
        return `'${contract.name}.${field}' should be ${contract.declared[field]}, got ${typeOfValue(row[field])}.`;
      }
      if (contract.declared[field] === 'int' && !Number.isInteger(row[field])) {
        return `'${contract.name}.${field}' should be a whole number (int), got ${String(row[field])}.`;
      }
    }
  }
  return null;
}
