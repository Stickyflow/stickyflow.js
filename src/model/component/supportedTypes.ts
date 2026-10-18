export const COMPONENT_TYPES = ['rollingNumber', 'tickScale', 'ruler'] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export function isComponentType(value: string | undefined): value is ComponentType {
  return value !== undefined && (COMPONENT_TYPES as readonly string[]).includes(value);
}
