import type { SflBlock, SflDocument } from '../ast';
import { collectCanvasDefinitions } from './definitions';
import type { EntityReaderContext } from './entityReader';
import { createEntityPropertyReaders } from './propertyReaders';
import { collectUnresolvedRefs } from './readers';
import type { SflDiagnostic } from './types';

export interface CanvasResolution {
  model?: SflBlock;
  diagnostics: SflDiagnostic[];
  entityReaderContext: EntityReaderContext;
}

export function createCanvasResolution(doc: SflDocument): CanvasResolution {
  const definitions = collectCanvasDefinitions(doc);

  return {
    model: definitions.model,
    diagnostics: collectUnresolvedRefs(doc, definitions.styles, definitions.layouts),
    entityReaderContext: createEntityPropertyReaders(definitions),
  };
}
