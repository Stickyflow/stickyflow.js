import { type Component, type ComponentValue, type GenericComponent, isGenericComponent } from '../model/component';
import { setMeshValue } from '../model/mesh';
import type { RenderInput } from '../renderInput/types';
import type { BindingValue, BoundProperty } from './types';

type Apply = (input: RenderInput, path: string[], value: BindingValue) => void;

const findChart = (input: RenderInput, id: string) => input.charts?.find(candidate => candidate.id === id);

function applyToSeries(
  input: RenderInput,
  path: string[],
  change: (series: { values: unknown; label: string }) => void,
): void {
  const chart = findChart(input, path[0]);
  if (!chart) {
    return;
  }
  let series = chart.series.find(candidate => candidate.id === path[1]);
  if (!series) {
    series = { id: path[1], label: path[1], values: [] };
    chart.series.push(series);
  }
  change(series);
}

export function findComponent(input: RenderInput, id: string): Component | undefined {
  return (input.components ?? input.widgets)?.find(candidate => candidate.id === id);
}

export function writeComponentValue(input: RenderInput, id: string, value: ComponentValue): void {
  const component = findComponent(input, id);
  if (!component) {
    return;
  }
  component.value = isGenericComponent(component) ? value : String(value);
}

export function writeComponentValueEnd(input: RenderInput, id: string, value: number): void {
  const component = findComponent(input, id);
  if (component && isGenericComponent(component)) {
    component.properties.valueEnd = value;
  }
}

export function writeComponentDisabled(input: RenderInput, id: string, disabled: boolean): void {
  const component = findComponent(input, id);
  if (component && isGenericComponent(component)) {
    component.disabled = disabled;
  }
}

export function isComponentDisabled(input: RenderInput, id: string): boolean {
  const component = findComponent(input, id);
  return component !== undefined && isGenericComponent(component) && component.disabled;
}

function setPath(
  input: RenderInput,
  path: string[],
  change: (item: NonNullable<RenderInput['paths']>[number]) => void,
) {
  const item = input.paths?.find(candidate => candidate.id === path[0]);
  if (item) {
    change(item);
  }
}

function setComponent(input: RenderInput, id: string, change: (component: GenericComponent) => void): void {
  const component = findComponent(input, id);
  if (component && isGenericComponent(component)) {
    change(component);
  }
}

function setShape(input: RenderInput, path: string[], change: (shape: RenderInput['shapes'][number]) => void): void {
  const shape = input.shapes.find(candidate => candidate.id === path[0]);
  if (shape) {
    change(shape);
  }
}

export const APPLY: Record<string, Apply> = {
  'Chart.categories': (input, path, value) => {
    const chart = findChart(input, path[0]);
    if (chart) {
      chart.config = { ...(chart.config ?? {}), categories: value as string[] } as typeof chart.config;
    }
  },
  'Chart.text': (input, path, value) => {
    const chart = findChart(input, path[0]);
    if (chart) {
      chart.title = value as string;
    }
  },
  'Series.values': (input, path, value) => applyToSeries(input, path, series => (series.values = value)),
  'Series.label': (input, path, value) => applyToSeries(input, path, series => (series.label = value as string)),
  'Shape.text': (input, path, value) => {
    const shape = input.shapes.find(candidate => candidate.id === path[0]);
    if (shape) {
      shape.text = value as string;
    }
  },
  'Shape.fill': (input, path, value) => setShape(input, path, shape => (shape.fillColor = value as string)),
  'Shape.stroke': (input, path, value) => setShape(input, path, shape => (shape.strokeColor = value as string)),
  'Shape.textColor': (input, path, value) => setShape(input, path, shape => (shape.textColor = value as string)),
  'Shape.opacity': (input, path, value) => setShape(input, path, shape => (shape.opacity = value as number)),
  'Shape.x': (input, path, value) => setShape(input, path, shape => (shape.x = value as number)),
  'Shape.y': (input, path, value) => setShape(input, path, shape => (shape.y = value as number)),
  'Shape.width': (input, path, value) => setShape(input, path, shape => (shape.width = value as number)),
  'Shape.height': (input, path, value) => setShape(input, path, shape => (shape.height = value as number)),
  'Shape.visible': (input, path, value) => setShape(input, path, shape => (shape.isVisible = value === true)),
  'Path.stroke': (input, path, value) => setPath(input, path, item => (item.strokeColor = value as string)),
  'Path.opacity': (input, path, value) => setPath(input, path, item => (item.opacity = value as number)),
  'Path.visible': (input, path, value) => setPath(input, path, item => (item.isVisible = value === true)),
  'Component.visible': (input, path, value) =>
    setComponent(input, path[0], component => (component.isVisible = value === true)),
  'Component.x': (input, path, value) => setComponent(input, path[0], component => (component.x = value as number)),
  'Component.y': (input, path, value) => setComponent(input, path[0], component => (component.y = value as number)),
  'Component.format': (input, path, value) =>
    setComponent(input, path[0], component => (component.properties.format = value as string)),
  'Component.value': (input, path, value) => writeComponentValue(input, path[0], value as ComponentValue),
  'Component.valueEnd': (input, path, value) => writeComponentValueEnd(input, path[0], value as number),
  'Component.disabled': (input, path, value) => writeComponentDisabled(input, path[0], value === true),
};

export function applyMesh(input: RenderInput, id: string, property: string, value: BindingValue): void {
  const mesh =
    input.meshes?.find(candidate => candidate.id === id) ??
    input.meshSurfaces?.find(item => item.id === id) ??
    input.meshLights?.find(item => item.id === id);
  if (mesh) {
    setMeshValue(mesh, property, value);
  }
}

export function applyShader(
  input: RenderInput,
  binding: BoundProperty,
  value: BindingValue,
  ownerId?: string,
): string[] {
  const owners: string[] = [];
  for (const shape of input.shapes) {
    if (shape.shader?.name === binding.ownerPath[0] && (ownerId === undefined || shape.id === ownerId)) {
      // Shapes that use one Shader share its object, so each one gets its own copy to hold its own value.
      shape.shader = {
        ...shape.shader,
        parameters: { ...shape.shader.parameters, [binding.property]: value as number },
      };
      owners.push(shape.id);
    }
  }
  return owners;
}
