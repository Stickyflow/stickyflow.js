import { isBuiltInComponentType } from './supportedTypes';
import type { Component, GenericComponent } from './types';

export function isGenericComponent(component: Component): component is GenericComponent {
  return !isBuiltInComponentType(component.type);
}
