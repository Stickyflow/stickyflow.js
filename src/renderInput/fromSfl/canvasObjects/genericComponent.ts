import {
  type ComponentDescriptor,
  type ComponentPropertyDescriptor,
  type ComponentValue,
  type ComponentValueDescriptor,
  type GenericComponent,
  getComponentDescriptor,
} from '../../../model/component';
import type { SflComponentObject } from '../../../sflSemantic/canvasObjects/types';
import { cssColor } from './values';

function numberProperty(
  descriptor: Extract<ComponentPropertyDescriptor, { type: 'number' }>,
  raw: string | undefined,
): number {
  const value = Number(raw);
  if (raw === undefined || raw === '' || !Number.isFinite(value)) {
    return descriptor.default;
  }
  const atLeast = descriptor.min === undefined ? value : Math.max(descriptor.min, value);
  return descriptor.max === undefined ? atLeast : Math.min(descriptor.max, atLeast);
}

function readProperty(descriptor: ComponentPropertyDescriptor, raw: string | undefined): ComponentValue {
  switch (descriptor.type) {
    case 'number':
      return numberProperty(descriptor, raw);
    case 'boolean':
      return raw === undefined ? descriptor.default : raw === 'true';
    case 'color':
      return descriptor.optional && raw === 'none' ? 'none' : (cssColor(raw) ?? descriptor.default);
    case 'enum':
      return raw !== undefined && descriptor.options.includes(raw) ? raw : descriptor.default;
    case 'string':
      return raw ?? descriptor.default;
  }
}

export function readComponentProperties(
  descriptor: ComponentDescriptor | undefined,
  props: Record<string, string>,
): Record<string, ComponentValue> {
  const properties: Record<string, ComponentValue> = {};
  for (const [key, property] of Object.entries(descriptor?.properties ?? {})) {
    properties[key] = readProperty(property, props[key]);
  }
  return properties;
}

export function readComponentValue(descriptor: ComponentValueDescriptor | undefined, raw: string): ComponentValue {
  if (!descriptor) {
    return '';
  }
  if (descriptor.type === 'boolean') {
    return raw === 'true';
  }
  if (descriptor.type === 'number') {
    const value = Number(raw);
    return Number.isFinite(value) ? value : (descriptor.default as number);
  }
  return raw;
}

export function genericComponentObject(canvasObject: SflComponentObject): GenericComponent {
  const descriptor = getComponentDescriptor(canvasObject.component.type);
  return {
    id: canvasObject.id,
    type: canvasObject.component.type,
    value: descriptor
      ? readComponentValue(descriptor.value, canvasObject.component.value)
      : canvasObject.component.value,
    disabled: canvasObject.props.disabled === 'true',
    label: canvasObject.component.label,
    x: canvasObject.x,
    y: canvasObject.y,
    width: canvasObject.width,
    height: canvasObject.height,
    rotation: canvasObject.rotation,
    order: canvasObject.order,
    sourceIndex: canvasObject.sourceIndex,
    parentFrameId: canvasObject.parentFrameId,
    properties: readComponentProperties(descriptor, canvasObject.props),
  };
}
