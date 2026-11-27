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
  setMeshValue?(meshId: string, property: string, value: number | string): unknown;
  // Forgets the values it was given, when another document takes the place of the one they were for.
  clearOverrides?(): unknown;
}

// What reading a document against the registered sources found. `writes` names the fields of sources of the host that the document
// writes, by source, so a host can ask before it lets a document write more than the one before.
export interface DocumentCheck {
  ok: boolean;
  diagnostics: BindingDiagnostic[];
  writes: Record<string, string[]>;
}

export type LiveChange =
  | { kind: 'component'; id: string; value: number }
  | { kind: 'shader'; owners: string[]; parameters: Record<string, number> }
  | { kind: 'mesh'; id: string; property: string; value: number | string };

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
  // The source a name reads now: one the host registered, or the record the runtime made for a Parameters block. A host that shows
  // the controls of a figure in a runtime of their own reads that record there and writes its values into this one.
  sourceOf(name: string): DataSource | undefined;
  // Reads another document and checks it against the registered sources. The document that runs is not touched.
  check(sfl: string): DocumentCheck;
  // Puts another document in the place of the one that runs, if it has no error. The registered sources and their listeners stay,
  // parameters keep their values under the same name, and what is attached is drawn anew at once.
  replace(sfl: string): DocumentCheck;
  setElementState(id: string, state: Partial<ElementState>): void;
  press(id: string): void;
  release(id: string, tapped: boolean): void;
  activate(id: string): void;
  focus(id: string, focused: boolean): void;
  submit(id: string): void;
  change(id: string, value: ComponentValue): boolean;
  slide(id: string, x: number, y?: number): void;
  drag(id: string, pointer?: number): void;
  tick(seconds: number): void;
  flush(): RenderResult | null;
  onRender(listener: (result: RenderResult) => void): () => void;
  attach(target: BindingTarget): () => void;
}
