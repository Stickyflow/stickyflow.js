import { componentTypes, isComponentType } from '../../model/component';
import { isComponentBlockKind, type SflBlock, type SflDocument } from '../../sflLanguage/ast';
import { childBlocks, directProperties } from '../ast/blockEntries';
import { asString } from '../ast/valueAccess';
import type { SflDiagnostic } from '../types';

export function collectUnsupportedComponentTypes(sflDocument: SflDocument): SflDiagnostic[] {
  const diagnostics: SflDiagnostic[] = [];

  const visit = (block: SflBlock): void => {
    if (isComponentBlockKind(block.kind)) {
      const type = asString(directProperties(block).get('type')) ?? 'rollingNumber';
      if (!isComponentType(type)) {
        diagnostics.push({
          severity: 'warning',
          code: 'unsupported-component-type',
          ownerId: block.name,
          message: `Unsupported component type '${type}'. Supported: ${componentTypes().join(', ')}.`,
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
