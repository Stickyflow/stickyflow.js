import type { SflBlock, SflDocument } from '../../sflLanguage/ast';
import { childBlocks, directProperties, layoutProperties, styleProperties } from '../ast/blockEntries';
import { EDGE_WORDS_BEFORE } from '../canvasObjects/artifacts/mesh/resolver';
import type { SflDiagnostic } from '../types';

const warning = (code: string, ownerId: string, message: string): SflDiagnostic => ({
  severity: 'warning',
  code,
  ownerId,
  message,
});

function meshesIn(block: SflBlock): SflBlock[] {
  return childBlocks(block).flatMap(child => (child.kind === 'Mesh' ? [child, ...meshesIn(child)] : meshesIn(child)));
}

function blocksIn(block: SflBlock): SflBlock[] {
  return [block, ...childBlocks(block).flatMap(blocksIn)];
}

// A Mesh draws only inside a Model, and a Model is never a mesh itself.
export function collectMeshProblems(sflDocument: SflDocument): SflDiagnostic[] {
  const outside = sflDocument.blocks.flatMap(block => {
    if (['Mesh', 'Solid', 'Facets', 'Terrain', 'Sketch', 'Scene', 'Canvas', 'Light', 'Ground'].includes(block.kind)) {
      return [
        warning(
          'mesh-outside-model',
          block.name,
          `${block.kind} '${block.name}' is not drawn: it has to be inside a Model.`,
        ),
      ];
    }
    if (block.kind === 'Model' && directProperties(block).has('asset')) {
      return [
        warning(
          'model-with-asset',
          block.name,
          `'asset' on a Model does nothing. Put the asset into a Mesh inside the Model.`,
        ),
      ];
    }
    return [];
  });
  const missing = sflDocument.blocks
    .filter(block => block.kind === 'Model')
    .flatMap(meshesIn)
    // An asset written in the style is read as well; form-in-style says where it belongs.
    .filter(mesh => !directProperties(mesh).has('asset') && !styleProperties(mesh).has('asset'))
    .map(mesh =>
      warning('mesh-without-asset', mesh.name, `Mesh '${mesh.name}' has no asset, so there is nothing to draw.`),
    );
  const onSurface = sflDocument.blocks
    .flatMap(blocksIn)
    .filter(block => block.kind === 'Canvas')
    .flatMap(meshesIn)
    .map(mesh =>
      warning(
        'mesh-on-canvas',
        mesh.name,
        `Mesh '${mesh.name}' lies on a Canvas, which is a flat surface. Put it into the Scene next to the Canvas.`,
      ),
    );
  const extraLights = sflDocument.blocks
    .flatMap(blocksIn)
    .filter(block => block.kind === 'Scene')
    .flatMap(scene =>
      childBlocks(scene)
        .filter(child => child.kind === 'Light')
        // the sun and two lights from the side
        .slice(3),
    )
    .map(light =>
      warning(
        'extra-light',
        light.name,
        `Light '${light.name}' does nothing: a Scene has one sun and up to two lights from the side.`,
      ),
    );
  // A Solid made from a Sketch takes its width and its depth from the Sketch, and its height from height.
  const sketchSizes = sflDocument.blocks
    .flatMap(blocksIn)
    .filter(
      block => block.kind === 'Solid' && directProperties(block).has('sketch') && layoutProperties(block).has('size'),
    )
    .map(solid =>
      warning(
        'sketch-solid-size',
        solid.name,
        directProperties(solid).has('height')
          ? `Solid '${solid.name}' is made from a Sketch, which gives its width and depth, and height gives its height: size in its layout does nothing.`
          : `Solid '${solid.name}' is made from a Sketch, which gives its width and depth. Its height is read from size in its layout, but is written as height: … now.`,
      ),
    );
  // A twin in a mirror is made of a Solid alone, and flip is the word for the twin, not one to write.
  const mirrors = sflDocument.blocks.flatMap(blocksIn).flatMap(block => {
    const own = directProperties(block);
    if (own.has('mirror') && block.kind !== 'Solid') {
      return [
        warning(
          'mirror-not-solid',
          block.name,
          `${block.kind} '${block.name}' has mirror, which makes a twin of a Solid alone: it does nothing here.`,
        ),
      ];
    }
    if (own.has('flip') && ['Solid', 'Cut', 'Add', 'Keep'].includes(block.kind)) {
      return [
        warning(
          'flip-written',
          block.name,
          `${block.kind} '${block.name}' writes flip, which is no word of SFL. It still mirrors this block alone and may go; mirror makes a mirrored twin beside it.`,
        ),
      ];
    }
    return [];
  });
  // The edges of a body are written by one family of words now: chamfer and fillet.
  const edgeWords = sflDocument.blocks
    .flatMap(blocksIn)
    .filter(block => ['Solid', 'Cut', 'Add', 'Keep'].includes(block.kind))
    .flatMap(block => {
      const own = directProperties(block);
      const words = Object.keys(EDGE_WORDS_BEFORE)
        .filter(word => own.get(word)?.type === 'list')
        .map(word => `${word} is written ${EDGE_WORDS_BEFORE[word]}`);
      const edge = own.get('edge');
      if (edge?.type === 'ident' && edge.segments[0] === 'round') {
        words.push('edge: round with chamfer is written fillet');
      }
      return words.length
        ? [
            warning(
              'edge-word-before',
              block.name,
              `${block.kind} '${block.name}': ${words.join(', ')} now. It is still read.`,
            ),
          ]
        : [];
    });
  // height is a length: a light says how high it stands by elevation, a Ground where it lies by its layout.
  const wordsBefore = sflDocument.blocks.flatMap(blocksIn).flatMap(block => {
    const own = directProperties(block);
    if (block.kind === 'Light' && own.has('height')) {
      return [
        warning(
          'light-height',
          block.name,
          `Light '${block.name}': height is written elevation now, the degrees above the horizon, as height is a length elsewhere. It is still read.`,
        ),
      ];
    }
    if (block.kind === 'Ground' && own.has('height')) {
      return [
        warning(
          'ground-height',
          block.name,
          `Ground '${block.name}': height is written as its place now, layout { position: 0, height, 0 }. It is still read.`,
        ),
      ];
    }
    return [];
  });
  return [
    ...outside,
    ...missing,
    ...onSurface,
    ...extraLights,
    ...sketchSizes,
    ...mirrors,
    ...edgeWords,
    ...wordsBefore,
  ];
}
