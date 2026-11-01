import { type Component, type ComponentValue, isGenericComponent } from '../model/component';
import type { Mesh } from '../model/mesh';
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

function setShape(input: RenderInput, path: string[], change: (shape: RenderInput['shapes'][number]) => void): void {
  const shape = input.shapes.find(candidate => candidate.id === path[0]);
  if (shape) {
    change(shape);
  }
}

function setMesh(input: RenderInput, path: string[], change: (mesh: Mesh) => void): void {
  const mesh = input.meshes?.find(candidate => candidate.id === path[0]);
  if (mesh) {
    change(mesh);
  }
}

const meshAxis =
  (vector: 'position' | 'rotation' | 'scale', index: number): Apply =>
  (input, path, value) =>
    setMesh(input, path, mesh => {
      mesh[vector][index] = value as number;
    });

export const APPLY: Record<string, Apply> = {
  'Mesh.color': (input, path, value) => setMesh(input, path, mesh => (mesh.color = value as string)),
  'Mesh.opacity': (input, path, value) => setMesh(input, path, mesh => (mesh.opacity = value as number)),
  'Mesh.roughness': (input, path, value) => setMesh(input, path, mesh => (mesh.roughness = value as number)),
  'Mesh.metallic': (input, path, value) => setMesh(input, path, mesh => (mesh.metallic = value as number)),
  'Mesh.positionX': meshAxis('position', 0),
  'Mesh.positionY': meshAxis('position', 1),
  'Mesh.positionZ': meshAxis('position', 2),
  'Mesh.rotationX': meshAxis('rotation', 0),
  'Mesh.rotationY': meshAxis('rotation', 1),
  'Mesh.rotationZ': meshAxis('rotation', 2),
  'Mesh.scale': (input, path, value) =>
    setMesh(input, path, mesh => {
      mesh.scale = [value as number, value as number, value as number];
    }),
  'Mesh.scaleX': meshAxis('scale', 0),
  'Mesh.scaleY': meshAxis('scale', 1),
  'Mesh.scaleZ': meshAxis('scale', 2),
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
  'Component.value': (input, path, value) => writeComponentValue(input, path[0], value as ComponentValue),
  'Component.valueEnd': (input, path, value) => writeComponentValueEnd(input, path[0], value as number),
  'Component.disabled': (input, path, value) => writeComponentDisabled(input, path[0], value === true),
};

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
