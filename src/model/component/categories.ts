// The shelves a component is filed on, in the order they are shown. A component names its shelf with `category`.
export const COMPONENT_CATEGORIES = [
  { id: 'action', label: 'Actions' },
  { id: 'selection', label: 'Selection' },
  { id: 'value', label: 'Value input' },
  { id: 'text', label: 'Text input' },
  { id: 'indicator', label: 'Indicators' },
  { id: 'instrument', label: 'Instruments' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'container', label: 'Containers' },
] as const;

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number]['id'];
