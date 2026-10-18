import { type Component, getComponentDescriptor, isGenericComponent } from '../../../model/component';
import type { RenderNode, SceneAria } from '../../scene';
import { tag } from '../../scene/tagging';
import { buildPlaceholder } from './placeholder';
import { getComponentBuilder } from './registry';

function ariaOf(component: Component): SceneAria | undefined {
  const role = getComponentDescriptor(component.type)?.role;
  if (!role || !isGenericComponent(component)) {
    return undefined;
  }
  const flag = typeof component.value === 'boolean' ? component.value : undefined;
  return {
    role,
    ...(flag === undefined ? {} : role === 'button' ? { pressed: flag } : { checked: flag }),
    ...(component.disabled ? { disabled: true } : {}),
  };
}

function labelOf(component: Component): string {
  return component.label ?? (isGenericComponent(component) ? component.id : String(component.value));
}

export function buildComponents(components: readonly Component[]): RenderNode[] {
  return components.flatMap((component, index) => {
    const build = getComponentBuilder(component.type) ?? buildPlaceholder;
    const nodes = tag(
      build(component, index),
      'widget',
      component.id,
      component.type,
      labelOf(component),
      component.parentFrameId,
    );
    const aria = ariaOf(component);
    const primary = nodes.find(node => node.identity?.primary);
    if (aria && primary?.identity) {
      primary.identity.aria = aria;
    }
    return nodes;
  });
}
