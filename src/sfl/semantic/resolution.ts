import type { SflBlock, SflDocument } from '../ast';
import { collectEmptySeries, collectUnsupportedChartTypes, collectUnsupportedGridShapes } from './chartDiagnostics';
import { collectUnresolvedCompositionReferences } from './compositionReferences';
import { collectCanvasDefinitions } from './definitions';
import type { EntityReaderContext } from './entityReader';
import { createEntityPropertyReaders } from './propertyReaders';
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
    diagnostics: [
      ...collectUnresolvedCompositionReferences(doc, definitions.styles, definitions.layouts),
      ...collectUnsupportedChartTypes(doc),
      ...collectUnsupportedGridShapes(doc),
      ...collectEmptySeries(doc),
    ],
    entityReaderContext: createEntityPropertyReaders(definitions),
  };
}
