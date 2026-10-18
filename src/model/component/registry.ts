import { BUILT_IN_DESCRIPTORS } from './builtIns';
import type { ComponentDescriptor } from './descriptor';

let version = 0;

const descriptors = new Map<string, ComponentDescriptor>(
  BUILT_IN_DESCRIPTORS.map(descriptor => [descriptor.type, descriptor]),
);

const TYPE_NAME = /^[A-Za-z][A-Za-z0-9]*$/;

export function registerComponentDescriptor(descriptor: ComponentDescriptor): () => void {
  if (!TYPE_NAME.test(descriptor.type)) {
    throw new Error(`'${descriptor.type}' is not a valid component type name.`);
  }
  if (descriptors.has(descriptor.type)) {
    throw new Error(`A component of type '${descriptor.type}' is already defined.`);
  }
  descriptors.set(descriptor.type, descriptor);
  version += 1;
  return () => {
    if (descriptors.get(descriptor.type) === descriptor) {
      descriptors.delete(descriptor.type);
      version += 1;
    }
  };
}

export function componentRegistryVersion(): number {
  return version;
}

export function getComponentDescriptor(type: string | undefined): ComponentDescriptor | undefined {
  return type === undefined ? undefined : descriptors.get(type);
}

export function componentTypes(): string[] {
  return [...descriptors.keys()];
}

export function isComponentType(value: string | undefined): boolean {
  return getComponentDescriptor(value) !== undefined;
}
