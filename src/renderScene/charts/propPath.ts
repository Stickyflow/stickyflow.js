const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function block(kind: string, id: string, property: string): string | undefined {
  return IDENT.test(id) ? `${kind}[${id}].${property}` : undefined;
}

export const CHART_TITLE_PROP = 'text';

export function axisLabelProp(axis: 'x' | 'y'): string {
  return `Axis[${axis}].label`;
}

export function categoryProp(index: number): string | undefined {
  return Number.isInteger(index) && index >= 0 ? `categories[${index}]` : undefined;
}

export function seriesLabelProp(id: string): string | undefined {
  return block('Series', id, 'label');
}

export function seriesColorProp(id: string): string | undefined {
  return block('Series', id, 'color');
}

export function seriesLabelOffsetXProp(id: string): string | undefined {
  return block('Series', id, 'labelOffsetX');
}

export function seriesLabelOffsetYProp(id: string): string | undefined {
  return block('Series', id, 'labelOffsetY');
}

export function seriesValueProp(id: string, index: number): string | undefined {
  return Number.isInteger(index) && index >= 0 ? block('Series', id, `values[${index}]`) : undefined;
}

export function seriesValueColorProp(id: string, index: number): string | undefined {
  return Number.isInteger(index) && index >= 0 ? block('Series', id, `colors[${index}]`) : undefined;
}

export function ruleTextProp(id: string): string | undefined {
  return block('Rule', id, 'text');
}

export function ruleAtProp(id: string): string | undefined {
  return block('Rule', id, 'at');
}
