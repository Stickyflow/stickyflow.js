import type { SflBlock, SflDocument } from '../../sflLanguage/ast';
import { childBlocks } from '../ast/blockEntries';
import type { SflDiagnostic } from '../types';

export interface CompositionReferences {
  styleRef?: string;
  layoutRef?: string;
}

export function classifyCompositionReferences(
  composition: string[],
  styleBlocks: Map<string, SflBlock>,
  layoutBlocks: Map<string, SflBlock>,
): CompositionReferences {
  let styleRef: string | undefined;
  let layoutRef: string | undefined;
  for (const reference of composition) {
    if (styleBlocks.has(reference)) {
      styleRef = reference;
    } else if (layoutBlocks.has(reference)) {
      layoutRef = reference;
    }
  }
  return { styleRef, layoutRef };
}

function collectBlockDiagnostics(
  block: SflBlock,
  styleBlocks: Map<string, SflBlock>,
  layoutBlocks: Map<string, SflBlock>,
  diagnostics: SflDiagnostic[],
): void {
  for (const reference of block.composition) {
    if (!styleBlocks.has(reference) && !layoutBlocks.has(reference)) {
      diagnostics.push({
        severity: 'warning',
        code: 'unresolved-style-or-layout',
        ownerId: block.name,
        message: `"${reference}" is not a Style or Layout defined at the top level of the document — "${block.name}" gets no shape, fill, or stroke from it.`,
      });
    }
  }
  for (const child of childBlocks(block)) {
    collectBlockDiagnostics(child, styleBlocks, layoutBlocks, diagnostics);
  }
}

export function collectUnresolvedCompositionReferences(
  sflDocument: SflDocument,
  styleBlocks: Map<string, SflBlock>,
  layoutBlocks: Map<string, SflBlock>,
): SflDiagnostic[] {
  const diagnostics: SflDiagnostic[] = [];
  for (const block of sflDocument.blocks) {
    collectBlockDiagnostics(block, styleBlocks, layoutBlocks, diagnostics);
  }
  return diagnostics;
}
