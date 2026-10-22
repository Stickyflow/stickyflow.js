import { cleanFootprint, type IsometricObject } from '../../../model/isometricObject';
import type { RenderNode } from '../../scene';
import { tag } from '../../scene/tagging';
import { buildBox } from './box';
import { buildExtruded } from './extruded';
import { buildSphere } from './sphere';

export function buildIsometricObject(object: IsometricObject, index: number): RenderNode[] {
  if (object.form === 'sphere') {
    return buildSphere(object, index);
  }
  const footprint = cleanFootprint(object.footprint);
  return footprint.length > 0 ? buildExtruded(object, index, footprint) : buildBox(object, index);
}

export function buildIsometricObjects(objects: readonly IsometricObject[]): RenderNode[] {
  return objects.flatMap((object, index) =>
    tag(
      buildIsometricObject(object, index),
      'isometric',
      object.id,
      'isometric',
      object.text ?? 'Isometric object',
      object.parentFrameId,
    ),
  );
}
