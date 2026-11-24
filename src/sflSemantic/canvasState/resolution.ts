import type { SflBlock, SflDocument } from '../../sflLanguage/ast';
import type { CanvasObjectResolutionContext } from '../canvasObjects/processing/resolver';
import { collectCanvasDefinitions } from '../definitions/collection';
import { collectUnresolvedCompositionReferences } from '../definitions/compositionReferences';
import { createCanvasObjectPropertyReaders } from '../definitions/propertyReaders';
import { collectEmptySeries, collectUnsupportedChartTypes, collectUnsupportedGridShapes } from '../diagnostics/charts';
import { collectUnsupportedComponentTypes } from '../diagnostics/components';
import { collectMeshProblems } from '../diagnostics/meshes';
import { collectDuplicateNames } from '../diagnostics/names';
import { collectPlacementsOutsideLayout } from '../diagnostics/placement';
import { collectPropertiesWrittenTwice } from '../diagnostics/properties';
import { collectUnknownReferences } from '../diagnostics/references';
import { collectModelScreenLines } from '../diagnostics/screens';
import type { SflDiagnostic } from '../types';

export interface CanvasResolution {
  model?: SflBlock;
  diagnostics: SflDiagnostic[];
  canvasObjectResolutionContext: CanvasObjectResolutionContext;
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
      ...collectUnsupportedComponentTypes(doc),
      ...collectDuplicateNames(doc),
      ...collectModelScreenLines(doc),
      ...collectMeshProblems(doc),
      ...collectPropertiesWrittenTwice(doc),
      ...collectUnknownReferences(doc),
      ...collectPlacementsOutsideLayout(doc),
    ],
    canvasObjectResolutionContext: createCanvasObjectPropertyReaders(definitions),
  };
}
