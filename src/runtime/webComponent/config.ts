import type { DataSource } from '../../binding';

export interface DiagramConfig {
  source: string | null;
  interactive: boolean;
  padding?: number;
  diagramId?: string;
  dataSources?: Record<string, DataSource>;
}

export const OBSERVED_ATTRS = ['source', 'interactive', 'padding', 'diagram-id'] as const;

const boolAttr = (value: string | null): boolean => value !== null && value !== 'false';

export function readConfig(getAttribute: (name: string) => string | null): DiagramConfig {
  const paddingRaw = getAttribute('padding');
  const padding =
    paddingRaw != null && paddingRaw !== '' && Number.isFinite(Number(paddingRaw)) ? Number(paddingRaw) : undefined;
  return {
    source: getAttribute('source'),
    interactive: boolAttr(getAttribute('interactive')),
    padding,
    diagramId: getAttribute('diagram-id') ?? undefined,
  };
}
