export type {
  ComponentDescriptor,
  ComponentGroup,
  ComponentInteraction,
  ComponentPropertyDescriptor,
  ComponentSize,
  ComponentValue,
  ComponentValueDescriptor,
  ComponentValueType,
} from './descriptor';
export { formatRollingNumber } from './format';
export { isGenericComponent } from './guards';
export {
  componentRegistryVersion,
  componentTypes,
  getComponentDescriptor,
  isComponentType,
  registerComponentDescriptor,
} from './registry';
export type { BuiltInComponentType, ComponentType } from './supportedTypes';
export { BUILT_IN_COMPONENT_TYPES, isBuiltInComponentType } from './supportedTypes';
export { COMPONENT_CATEGORIES, type ComponentCategory } from './categories';
export { DEFAULT_ROLLING_NUMBER_STYLE, resolveRollingNumberStyle } from './theme';
export type {
  Component,
  GenericComponent,
  RollingNumberComponent,
  RollingNumberComponentStyle,
  RulerComponent,
  TickScaleComponent,
} from './types';
