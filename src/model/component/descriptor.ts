export type ComponentGroup = 'readout' | 'input' | 'action' | 'navigation';

export type ComponentValueType = 'number' | 'string' | 'boolean';

export type ComponentValue = number | string | boolean;

export type ComponentInteraction = 'none' | 'toggle' | 'press' | 'scale' | 'slide' | 'pick' | 'turn' | 'range';

export interface ComponentValueDescriptor {
  type: ComponentValueType;
  writable: boolean;
  default: ComponentValue;
}

export type ComponentPropertyDescriptor =
  | { type: 'number'; default: number; min?: number; max?: number; step?: number }
  | { type: 'boolean'; default: boolean }
  | { type: 'string'; default: string }
  | { type: 'color'; default: string }
  | { type: 'enum'; default: string; options: readonly string[] };

export interface ComponentSize {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  aspect?: number;
}

export interface ComponentDescriptor {
  type: string;
  group: ComponentGroup;
  // The shelf it is filed on in documentation and in the lists to pick from. See COMPONENT_CATEGORIES.
  category?: string;
  value?: ComponentValueDescriptor;
  properties: Record<string, ComponentPropertyDescriptor>;
  interaction: ComponentInteraction;
  pointerScale: boolean;
  size: ComponentSize;
  role?: string;
}
