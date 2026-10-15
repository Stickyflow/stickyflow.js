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
  'Widget.value': (input, path, value) => {
    const widget = input.widgets?.find(candidate => candidate.id === path[0]);
    if (widget) {
      widget.value = String(value);
    }
  },
};

export function applyShader(input: RenderInput, binding: BoundProperty, value: BindingValue): string[] {
  const owners: string[] = [];
  for (const shape of input.shapes) {
    if (shape.shader?.name === binding.ownerPath[0]) {
      shape.shader.parameters = { ...shape.shader.parameters, [binding.property]: value as number };
      owners.push(shape.id);
    }
  }
  return owners;
}
