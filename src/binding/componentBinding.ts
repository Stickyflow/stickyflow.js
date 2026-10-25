import { getComponentDescriptor } from '../model/component';
import type { SflExpr } from '../sflLanguage/ast';
import type { BindingType, DataSourceContract } from './types';

// `valueEnd` is the second value of a component that holds two, such as the upper end of a range.
export const BINDABLE_COMPONENT_PROPERTIES = ['value', 'valueEnd', 'disabled'];

export function acceptsUserChange(componentType: string | undefined): boolean {
  return getComponentDescriptor(componentType)?.value?.writable === true;
}

export function componentStateType(componentType: string | undefined, state: string): BindingType | undefined {
  const descriptor = getComponentDescriptor(componentType);
  if (state === 'focused') {
    return 'boolean';
  }
  if (state === 'pointer') {
    return descriptor?.pointerScale ? 'number' : undefined;
  }
  return state === 'value' ? descriptor?.value?.type : undefined;
}

export function componentPropertyType(componentType: string | undefined, property: string): BindingType | undefined {
  if (property === 'disabled') {
    return 'boolean';
  }
  if (property === 'valueEnd') {
    return getComponentDescriptor(componentType)?.properties.valueEnd?.type === 'number' ? 'number' : undefined;
  }
  return property === 'value' ? getComponentDescriptor(componentType)?.value?.type : undefined;
}

export function twoWayTargetProblem(
  key: string,
  expr: SflExpr,
  contracts: Map<string, DataSourceContract>,
): string | undefined {
  const target = expr.kind === 'ref' ? expr.path : undefined;
  const contract = target?.length === 2 ? contracts.get(target[0]) : undefined;
  if (!target || contract?.mode !== 'record' || !contract.fields[target[1]]) {
    return `'<->' on '${key}' has to name one field of a record DataSource, as in <DataSource>.<field>.`;
  }
  return undefined;
}
