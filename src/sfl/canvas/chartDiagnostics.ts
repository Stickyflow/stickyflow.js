import { CHART_TYPES, isChartType } from '../../model/charts';
import type { SflBlock, SflDocument } from '../ast';
import { childBlocks, directProperties } from './blockEntries';
import type { SflDiagnostic } from './types';
import { asString } from './valueAccess';

export function collectUnsupportedChartTypes(doc: SflDocument): SflDiagnostic[] {
  const diagnostics: SflDiagnostic[] = [];

  const visit = (block: SflBlock): void => {
    if (block.kind === 'Chart') {
      const declared = asString(directProperties(block).get('type'));
      if (declared !== undefined && !isChartType(declared)) {
        diagnostics.push({
          severity: 'warning',
          code: 'unsupported-chart-type',
          entityId: block.name,
          message: `Unsupported chart type '${declared}' — drawn as a plain series plot. Supported: ${CHART_TYPES.join(', ')}.`,
        });
      }
    }
    for (const child of childBlocks(block)) {
      visit(child);
    }
  };

  for (const block of doc.blocks) {
    visit(block);
  }
  return diagnostics;
}
