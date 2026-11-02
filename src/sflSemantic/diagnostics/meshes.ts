import type { SflBlock, SflDocument } from '../../sflLanguage/ast';
import { childBlocks, directProperties } from '../ast/blockEntries';
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
    if (block.kind === 'Mesh' || block.kind === 'Scene' || block.kind === 'Canvas' || block.kind === 'Light') {
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
    .filter(mesh => !directProperties(mesh).has('asset'))
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
        .slice(1),
    )
    .map(light =>
      warning(
        'extra-light',
        light.name,
        `Light '${light.name}' does nothing: a Scene has one sun, and the first counts.`,
      ),
    );
  return [...outside, ...missing, ...onSurface, ...extraLights];
}
