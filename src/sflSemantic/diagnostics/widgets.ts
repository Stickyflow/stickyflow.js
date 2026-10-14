import type { SflBlock, SflDocument } from '../../sflLanguage/ast';
import { childBlocks, directProperties } from '../ast/blockEntries';
import { asString } from '../ast/valueAccess';
import type { SflDiagnostic } from '../types';

export function collectUnsupportedWidgetTypes(sflDocument: SflDocument): SflDiagnostic[] {
  const diagnostics: SflDiagnostic[] = [];

  const visit = (block: SflBlock): void => {
    if (block.kind === 'Widget') {
      const type = asString(directProperties(block).get('type')) ?? 'rollingNumber';
      if (type !== 'rollingNumber' && type !== 'tickScale') {
        diagnostics.push({
          severity: 'warning',
          code: 'unsupported-widget-type',
          ownerId: block.name,
          message: `Unsupported widget type '${type}'. Supported: rollingNumber, tickScale.`,
        });
      }
    }
    for (const child of childBlocks(block)) {
      visit(child);
    }
  };

  for (const block of sflDocument.blocks) {
    visit(block);
  }
  return diagnostics;
}
