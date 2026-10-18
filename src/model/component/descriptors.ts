import { type ComponentType, isComponentType } from './supportedTypes';

export interface ComponentDescriptor {
  group: 'readout' | 'input';
  scale: boolean;
}

export const COMPONENT_DESCRIPTORS: Record<ComponentType, ComponentDescriptor> = {
  rollingNumber: { group: 'readout', scale: false },
  tickScale: { group: 'readout', scale: true },
  ruler: { group: 'input', scale: true },
};

export function isScaleComponentType(value: string | undefined): boolean {
  return isComponentType(value) && COMPONENT_DESCRIPTORS[value].scale;
}
