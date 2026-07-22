// Pure attribute → config parsing for <stickyflow-diagram> (no DOM). Written as a
// function over a generic attribute getter so it is node-testable and reused by
// the element unchanged.

export interface DiagramConfig {
  /** SFL source text, or null when nothing to render yet. */
  source: string | null;
  /** Bind the interaction tier (viewer). Default false = static render only. */
  interactive: boolean;
  /** Extra space around the diagram bounds. */
  padding?: number;
  diagramId?: string;
}

export const OBSERVED_ATTRS = ['source', 'interactive', 'padding', 'diagram-id'] as const;

/** A boolean attribute is true by presence (`interactive`, `interactive=""`). */
const boolAttr = (value: string | null): boolean => value !== null && value !== 'false';

export function readConfig(getAttribute: (name: string) => string | null): DiagramConfig {
  const paddingRaw = getAttribute('padding');
  const padding = paddingRaw != null && paddingRaw !== '' && Number.isFinite(Number(paddingRaw))
    ? Number(paddingRaw)
    : undefined;
  return {
    source: getAttribute('source'),
    interactive: boolAttr(getAttribute('interactive')),
    padding,
    diagramId: getAttribute('diagram-id') ?? undefined,
  };
}
