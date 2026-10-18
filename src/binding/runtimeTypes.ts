import type { ComponentValue } from '../model/component';
import type { RenderOptions, RenderResult } from '../render';
import type { RenderInput } from '../renderInput/types';
import type { DataSource } from './dataSource';
import type { BindingGraph } from './graph';
import type { InteractiveElements } from './interactive';
import type { BindingDiagnostic } from './types';

export interface BindingRuntimeOptions {
  renderOptions?: RenderOptions;
}

export interface BindingTarget {
  update(next: { svg: string }): void;
  setComponentValue?(componentId: string, value: string | number): unknown;
  setWidgetValue?(componentId: string, value: string | number): unknown;
  setShaderParameters?(ownerId: string, parameters: Record<string, number>): unknown;
}

export type LiveChange =
  | { kind: 'component'; id: string; value: number }
  | { kind: 'shader'; owners: string[]; parameters: Record<string, number> };

export interface ElementState {
  pressed: boolean;
  hovered: boolean;
  focused: boolean;
  pointer: number;
  value: ComponentValue;
}

export interface BindingRuntime {
  readonly diagnostics: BindingDiagnostic[];
  readonly graph: BindingGraph;
  readonly interactive: InteractiveElements;
  readonly input: RenderInput;
  registerSource(name: string, source: DataSource): () => void;
  setElementState(id: string, state: Partial<ElementState>): void;
  press(id: string): void;
  release(id: string, tapped: boolean): void;
  activate(id: string): void;
  change(id: string, value: ComponentValue): boolean;
  drag(id: string, pointer?: number): void;
  tick(seconds: number): void;
  flush(): RenderResult | null;
  onRender(listener: (result: RenderResult) => void): () => void;
  attach(target: BindingTarget): () => void;
}
