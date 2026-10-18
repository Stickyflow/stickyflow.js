export const BUILT_IN_COMPONENT_TYPES = ['rollingNumber', 'tickScale', 'ruler'] as const;

export type BuiltInComponentType = (typeof BUILT_IN_COMPONENT_TYPES)[number];

export type ComponentType = string;

export function isBuiltInComponentType(value: string | undefined): value is BuiltInComponentType {
  return value !== undefined && (BUILT_IN_COMPONENT_TYPES as readonly string[]).includes(value);
}
