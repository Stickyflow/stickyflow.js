import type { Component, ComponentType } from '../../../model/component';
import type { RenderNode } from '../../scene';
import { buildRollingNumber, buildRuler, buildTickScale } from './builtIn';
import { buildButton } from './button';
import { buildCheckbox } from './checkbox';
import { buildKnob } from './knob';
import { buildProgress } from './progress';
import { buildSegmented } from './segmented';
import { buildSlider } from './slider';
import { buildSwitch } from './switch';
import { buildToggleButton } from './toggleButton';

export type ComponentBuilder = (component: Component, index: number) => RenderNode[];

const asComponentBuilder =
  <T extends Component>(build: (component: T, index: number) => RenderNode[]): ComponentBuilder =>
  (component, index) =>
    build(component as T, index);

const builders = new Map<ComponentType, ComponentBuilder>([
  ['rollingNumber', asComponentBuilder(buildRollingNumber)],
  ['tickScale', asComponentBuilder(buildTickScale)],
  ['ruler', asComponentBuilder(buildRuler)],
  ['switch', asComponentBuilder(buildSwitch)],
  ['checkbox', asComponentBuilder(buildCheckbox)],
  ['toggleButton', asComponentBuilder(buildToggleButton)],
  ['button', asComponentBuilder(buildButton)],
  ['slider', asComponentBuilder(buildSlider)],
  ['progress', asComponentBuilder(buildProgress)],
  ['segmented', asComponentBuilder(buildSegmented)],
  ['knob', asComponentBuilder(buildKnob)],
  ['range', asComponentBuilder(buildSlider)],
]);

export function registerComponentBuilder(type: ComponentType, builder: ComponentBuilder): () => void {
  builders.set(type, builder);
  return () => {
    if (builders.get(type) === builder) {
      builders.delete(type);
    }
  };
}

export function getComponentBuilder(type: ComponentType): ComponentBuilder | undefined {
  return builders.get(type);
}
