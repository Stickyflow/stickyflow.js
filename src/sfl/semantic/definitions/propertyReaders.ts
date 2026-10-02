import type { SflBlock, SflValue } from '../../ast';
import { directProperties, layoutProperties, styleProperties } from '../ast/blockEntries';
import type { CanvasObjectReaderContext } from '../canvasObjects/processing/reader';
import type { CanvasDefinitions } from './collection';
import { classifyCompositionReferences } from './compositionReferences';
import { resolveDefinitionInheritance } from './inheritance';

export function createCanvasObjectPropertyReaders(definitions: CanvasDefinitions): CanvasObjectReaderContext {
  const { styles, layouts, symbols } = definitions;
  const references = (block: SflBlock) => classifyCompositionReferences(block.composition, styles, layouts);
  const resolvedStyles = resolveDefinitionInheritance(styles, block => references(block).styleRef);
  const resolvedLayouts = resolveDefinitionInheritance(layouts, block => references(block).layoutRef);

  const mergedProps = (block: SflBlock): Map<string, SflValue> => {
    const merged = new Map(resolvedStyles.get(references(block).styleRef ?? '') ?? []);
    for (const [key, value] of directProperties(block)) {
      merged.set(key, value);
    }
    for (const [key, value] of styleProperties(block)) {
      merged.set(key, value);
    }
    return merged;
  };

  const layoutProp = (block: SflBlock, key: string): SflValue | undefined => {
    const localProperties = layoutProperties(block);
    if (localProperties.has(key)) {
      return localProperties.get(key);
    }

    const reference = references(block).layoutRef;
    return reference ? resolvedLayouts.get(reference)?.get(key) : undefined;
  };

  return { mergedProps, layoutProp, symbolDefs: symbols };
}
