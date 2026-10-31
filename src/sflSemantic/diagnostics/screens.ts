import type { SflDocument } from '../../sflLanguage/ast';
import { directProperties } from '../ast/blockEntries';
import type { SflDiagnostic } from '../types';

const MODEL_SCREEN_LINES = ['device', 'screen', 'screenColor', 'at'];

// From version 1.7 a screen is a block of its own, so these lines of the Model do nothing there.
export function collectModelScreenLines(sflDocument: SflDocument): SflDiagnostic[] {
  if (Number(sflDocument.version) < 1.7) {
    return [];
  }
  return sflDocument.blocks
    .filter(block => block.kind === 'Model')
    .flatMap(model => {
      const properties = directProperties(model);
      return MODEL_SCREEN_LINES.filter(key => properties.has(key)).map(
        (key): SflDiagnostic => ({
          severity: 'warning',
          code: 'model-screen-line',
          ownerId: model.name,
          message: `'${key}' on a Model is no longer used from sfl 1.7. Put the design into a Screen block.`,
        }),
      );
    });
}
