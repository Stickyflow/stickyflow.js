import { collectRefs } from './expression';
import type { BindingGraph } from './graph';

export interface InteractiveElements {
  pressable: ReadonlySet<string>;
  scales: ReadonlySet<string>;
}

export function interactiveElements(graph: BindingGraph): InteractiveElements {
  const pressable = new Set<string>();
  const scales = new Set<string>();
  const note = ([name, state]: string[]) => {
    if (graph.contracts.has(name) || !graph.elements.has(name)) {
      return;
    }
    (state === 'pointer' ? scales : pressable).add(name);
  };
  for (const handler of graph.handlers) {
    if (handler.ownerKind !== 'DataSource') {
      pressable.add(handler.ownerPath[0]);
    }
    for (const assignment of handler.assignments) {
      collectRefs(assignment.expr).forEach(note);
    }
  }
  for (const binding of graph.bindings) {
    collectRefs(binding.expr).forEach(note);
  }
  return { pressable, scales };
}
