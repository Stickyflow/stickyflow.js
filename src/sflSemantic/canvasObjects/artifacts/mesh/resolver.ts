import { DEFAULT_LIGHT, DEFAULT_ORBIT, type Vec3 } from '../../../../model/mesh';
import type { SflBlock, SflValue } from '../../../../sflLanguage/ast';
import { asNumber, asString, tupleValues } from '../../../ast/valueAccess';
import type { SflCanvasObjectBase } from '../../types';
import type {
  SflMeshGroundObject,
  SflMeshLightObject,
  SflMeshObject,
  SflMeshSceneObject,
  SflMeshSurfaceObject,
} from './object';
import type { SflAnchorData } from './types';

type LayoutProp = (block: SflBlock, key: string) => SflValue | undefined;

function vector(block: SflBlock, layoutProp: LayoutProp, key: string, fallback: number): Vec3 {
  const value = layoutProp(block, key);
  const single = asNumber(value);
  const [x = single ?? fallback, y = single ?? fallback, z = single ?? fallback] = tupleValues(value) ?? [];
  const axis = (name: string, plain: number) => asNumber(layoutProp(block, `${key}${name}`)) ?? plain;
  return [axis('X', x), axis('Y', y), axis('Z', z)];
}

export function resolveMeshObject(
  base: SflCanvasObjectBase,
  block: SflBlock,
  properties: Map<string, SflValue>,
  layoutProp: LayoutProp,
): SflMeshObject {
  return {
    ...base,
    objectType: 'mesh',
    mesh: {
      asset: asString(properties.get('asset')) ?? '',
      role: asString(properties.get('role')),
      color: asString(properties.get('color')),
      opacity: asNumber(properties.get('opacity')),
      roughness: asNumber(properties.get('roughness')),
      metallic: asNumber(properties.get('metallic')),
      position: vector(block, layoutProp, 'position', 0),
      rotation: vector(block, layoutProp, 'rotation', 0),
      scale: vector(block, layoutProp, 'scale', 1),
    },
  };
}

export function resolveMeshSceneObject(
  base: SflCanvasObjectBase,
  properties: Map<string, SflValue>,
): SflMeshSceneObject {
  const [yaw = DEFAULT_ORBIT[0], pitch = DEFAULT_ORBIT[1]] = tupleValues(properties.get('orbit')) ?? [];
  return {
    ...base,
    objectType: 'meshScene',
    meshScene: {
      orbit: [yaw, pitch],
      shadow: asString(properties.get('shadow')) === 'true',
      environment: asString(properties.get('environment')),
      environmentTurn: asNumber(properties.get('environmentTurn')),
      exposure: asNumber(properties.get('exposure')),
    },
  };
}

// Its position is in the world, so it says nothing about the drawing: what lies on it counts from its own corner.
export function resolveMeshSurfaceObject(
  base: SflCanvasObjectBase,
  block: SflBlock,
  layoutProp: LayoutProp,
): SflMeshSurfaceObject {
  return {
    ...base,
    x: 0,
    y: 0,
    objectType: 'meshSurface',
    meshSurface: {
      position: vector(block, layoutProp, 'position', 0),
      rotation: vector(block, layoutProp, 'rotation', 0),
      scale: vector(block, layoutProp, 'scale', 1),
    },
  };
}

export function resolveMeshLightObject(
  base: SflCanvasObjectBase,
  properties: Map<string, SflValue>,
): SflMeshLightObject {
  return {
    ...base,
    objectType: 'meshLight',
    meshLight: {
      turn: asNumber(properties.get('turn')) ?? DEFAULT_LIGHT.turn,
      height: asNumber(properties.get('height')) ?? DEFAULT_LIGHT.height,
      color: asString(properties.get('color')),
      intensity: asNumber(properties.get('intensity')) ?? DEFAULT_LIGHT.intensity,
      ambient: asNumber(properties.get('ambient')) ?? DEFAULT_LIGHT.ambient,
      softness: asNumber(properties.get('softness')),
    },
  };
}

// The ground of a Scene. Without a height it lies under the meshes, and without a color only its shadows and reflections show.
export function resolveMeshGroundObject(
  base: SflCanvasObjectBase,
  properties: Map<string, SflValue>,
): SflMeshGroundObject {
  const color = asString(properties.get('color'));
  return {
    ...base,
    objectType: 'meshGround',
    meshGround: {
      height: asNumber(properties.get('height')),
      color: color === 'none' ? undefined : color,
      reflection: Math.min(1, Math.max(0, asNumber(properties.get('reflection')) ?? 0)),
      roughness: Math.min(1, Math.max(0, asNumber(properties.get('roughness')) ?? 0)),
    },
  };
}

export function readAnchor(properties: Map<string, SflValue>): SflAnchorData | undefined {
  const mesh = asString(properties.get('anchor'));
  if (!mesh) {
    return undefined;
  }
  const [x = 0, y = 0, z = 0] = tupleValues(properties.get('anchorAt')) ?? [];
  return { mesh, point: [x, y, z] };
}
