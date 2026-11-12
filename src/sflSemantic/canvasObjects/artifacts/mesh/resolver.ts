import { DEFAULT_LIGHT, DEFAULT_ORBIT, type Vec3 } from '../../../../model/mesh';
import { type Outline, ringArea } from '../../../../model/outline';
import { flattenPath } from '../../../../model/path';
import { circleRing, pickedOutline, roundedRing } from '../../../../model/sketch';
import { type SolidJoin, solidAssetName, turn } from '../../../../model/solid';
import type { SflBlock, SflValue } from '../../../../sflLanguage/ast';
import { childBlocks, directProperties } from '../../../ast/blockEntries';
import { asNumber, asString, listNumbers, tupleValues } from '../../../ast/valueAccess';
import type { SflCanvasObjectBase, SflSymbolDefinition } from '../../types';
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

const SQUARE: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

// The outline a Solid or a body joined to it is pulled up from, turned over when the Solid is mirrored.
function outlineOf(
  properties: Map<string, SflValue>,
  symbolDefs: Map<string, SflSymbolDefinition>,
  flip?: string,
): Outline {
  const symbol = symbolDefs.get(asString(properties.get('symbol')) ?? '');
  const flat = symbol
    ? (symbol.rings ?? [
        flattenPath({
          points: symbol.points.map(([x, y], index) => {
            const tension = symbol.pointTensions?.[index];
            return tension === undefined ? { x, y } : { x, y, tension };
          }),
          tension: symbol.tension ?? 0,
          closed: true,
        }).map(point => [point.x, point.y] as [number, number]),
      ])
    : [SQUARE];
  // A ring written by hand may run either way. The rings of a symbol with Cut or Add run the right way already.
  const rings = symbol?.rings ?? flat.map(ring => (ringArea(ring) > 0 ? ring : [...ring].reverse()));
  return flip === 'x' || flip === 'z'
    ? rings.map(ring => ring.map(([x, y]) => (flip === 'x' ? [1 - x, y] : [x, 1 - y]) as [number, number]).reverse())
    : rings;
}

// What a Solid takes from a Sketch: the outline of the pieces it picks, within the box round them, and where that box lies.
interface FromSketch {
  rings: Outline;
  width: number;
  depth: number;
  position: Vec3;
  rotation: Vec3;
}

const pair = (value: SflValue | undefined): [number, number] => {
  const [x = 0, y = 0] = tupleValues(value) ?? [];
  return [x, y];
};

// The shapes of a Sketch as rings on its plane.
function sketchShapes(sketch: SflBlock): Outline {
  return childBlocks(sketch).flatMap((shape): Outline => {
    const own = directProperties(shape);
    if (shape.kind === 'Circle') {
      const radius = asNumber(own.get('radius')) ?? 0;
      return radius > 0 ? [circleRing(pair(own.get('at')), radius)] : [];
    }
    if (shape.kind === 'Rect') {
      const [x, y] = pair(own.get('at'));
      const [width, height] = pair(own.get('size'));
      const one = asNumber(own.get('radius'));
      const radii = tupleValues(own.get('radius')) ?? [one ?? 0, one ?? 0, one ?? 0, one ?? 0];
      return width > 0 && height > 0
        ? [
            roundedRing(
              [
                [x, y],
                [x + width, y],
                [x + width, y + height],
                [x, y + height],
              ],
              radii,
            ),
          ]
        : [];
    }
    const points = own.get('points');
    if (shape.kind !== 'Outline' || points?.type !== 'list') {
      return [];
    }
    const rows = points.values.map(item => listNumbers(item) ?? []).filter(row => row.length >= 2);
    return rows.length >= 3
      ? [
          roundedRing(
            rows.map(row => [row[0], row[1]] as [number, number]),
            rows.map(row => row[2] ?? 0),
          ),
        ]
      : [];
  });
}

function fromSketch(
  properties: Map<string, SflValue>,
  layoutProp: LayoutProp,
  sketchDefs: Map<string, SflBlock> | undefined,
): FromSketch | undefined {
  const sketch = sketchDefs?.get(asString(properties.get('sketch')) ?? '');
  if (!sketch) {
    return undefined;
  }
  const pick = properties.get('pick');
  const picks =
    pick?.type === 'list'
      ? pick.values.flatMap(item => {
          const at = listNumbers(item);
          return at && at.length >= 2 ? [[at[0], at[1]] as [number, number]] : [];
        })
      : [];
  const outline = pickedOutline(sketchShapes(sketch), picks);
  const points = outline.filter(ring => ringArea(ring) > 0).flat();
  if (points.length === 0) {
    return undefined;
  }
  const xs = points.map(point => point[0]);
  const ys = points.map(point => point[1]);
  const [left, top] = [Math.min(...xs), Math.min(...ys)];
  const [width, depth] = [Math.max(...xs) - left, Math.max(...ys) - top];
  if (width < 1e-9 || depth < 1e-9) {
    return undefined;
  }
  const rotation = vector(sketch, layoutProp, 'rotation', 0);
  const origin = vector(sketch, layoutProp, 'position', 0);
  const m = turn(rotation);
  const [u, v] = [left + width / 2, top + depth / 2];
  return {
    rings: outline.map(ring => ring.map(([x, y]) => [(x - left) / width, (y - top) / depth] as [number, number])),
    width,
    depth,
    position: [origin[0] + m[0] * u + m[2] * v, origin[1] + m[3] * u + m[5] * v, origin[2] + m[6] * u + m[8] * v],
    rotation,
  };
}

// The rims of a Solid: `chamfer` is the one of the top and the bottom, or `chamfer: top, bottom`, and `edge: round`
// rounds them instead of cutting them straight.
function rimOf(
  properties: Map<string, SflValue>,
): Pick<SolidJoin, 'chamfer' | 'chamferBottom' | 'round' | 'corners' | 'edges'> {
  const value = properties.get('chamfer');
  const [top = asNumber(value) ?? 0, bottom = top] = tupleValues(value) ?? [];
  // `round` and `cut` name upright edges: each as the ring of the outline, its corner and how far, as [ring, corner, size].
  const corners = (['cut', 'round'] as const).flatMap((name, kind) => {
    const list = properties.get(name);
    return list?.type === 'list'
      ? list.values.flatMap(item => {
          const [ring, at, size] = listNumbers(item) ?? [];
          return size !== undefined && size > 0 ? [[ring, at, size, kind] as [number, number, number, number]] : [];
        })
      : [];
  });
  // `roundTop`, `roundBottom`, `cutTop` and `cutBottom` name single edges of the top or the bottom: each as the ring of the
  // outline, the corner it starts at and how far, as [ring, corner, size].
  const edges = (
    [
      ['cutBottom', 0, 0],
      ['cutTop', 1, 0],
      ['roundBottom', 0, 1],
      ['roundTop', 1, 1],
    ] as const
  ).flatMap(([name, top, round]) => {
    const list = properties.get(name);
    return list?.type === 'list'
      ? list.values.flatMap(item => {
          const [ring, at, size] = listNumbers(item) ?? [];
          return size !== undefined && size > 0
            ? [[ring, at, size, top, round] as [number, number, number, number, number]]
            : [];
        })
      : [];
  });
  return {
    ...(corners.length > 0 ? { corners } : {}),
    ...(edges.length > 0 ? { edges } : {}),
    chamfer: top,
    ...(bottom !== top ? { chamferBottom: bottom } : {}),
    ...(asString(properties.get('edge')) === 'round' ? { round: true } : {}),
  };
}

const JOININGS: Record<string, SolidJoin['joining']> = { Cut: 'cut', Add: 'add', Keep: 'keep' };

// A Solid is a mesh whose model is built from its outline and from the bodies joined to it. The name of that model
// says all it is built from, so two Solids of one shape share one model.
function solidAsset(
  block: SflBlock,
  properties: Map<string, SflValue>,
  layoutProp: LayoutProp,
  symbolDefs: Map<string, SflSymbolDefinition>,
  sketched?: FromSketch,
): string {
  const flip = asString(properties.get('flip'));
  const joins = childBlocks(block)
    .filter(child => child.kind in JOININGS)
    .map((child): SolidJoin => {
      const own = directProperties(child);
      return {
        joining: JOININGS[child.kind],
        rings: outlineOf(own, symbolDefs, flip),
        size: vector(child, layoutProp, 'size', 1),
        ...rimOf(own),
        position: mirrored(vector(child, layoutProp, 'position', 0), flip, [-1, 1, 1], [1, 1, -1]),
        rotation: mirrored(vector(child, layoutProp, 'rotation', 0), flip, [1, -1, -1], [-1, -1, 1]),
      };
    });
  return solidAssetName({
    rings: sketched?.rings ?? outlineOf(properties, symbolDefs, flip),
    size: sketched
      ? [sketched.width, asNumber(properties.get('height')) ?? vector(block, layoutProp, 'size', 1)[1], sketched.depth]
      : vector(block, layoutProp, 'size', 1),
    ...rimOf(properties),
    ...(joins.length > 0 ? { joins } : {}),
  });
}

export function resolveMeshObject(
  base: SflCanvasObjectBase,
  block: SflBlock,
  properties: Map<string, SflValue>,
  layoutProp: LayoutProp,
  symbolDefs: Map<string, SflSymbolDefinition> = new Map(),
  sketchDefs?: Map<string, SflBlock>,
): SflMeshObject {
  const flip = block.kind === 'Solid' ? asString(properties.get('flip')) : undefined;
  // A Solid made from a Sketch stands on the plane of that Sketch and is turned with it. Its own position moves it from there,
  // along the plane and away from it.
  const sketched = block.kind === 'Solid' ? fromSketch(properties, layoutProp, sketchDefs) : undefined;
  const own = vector(block, layoutProp, 'position', 0);
  const turned = sketched && turn(sketched.rotation);
  const placed: Vec3 | undefined =
    sketched && turned
      ? [
          sketched.position[0] + turned[0] * own[0] + turned[1] * own[1] + turned[2] * own[2],
          sketched.position[1] + turned[3] * own[0] + turned[4] * own[1] + turned[5] * own[2],
          sketched.position[2] + turned[6] * own[0] + turned[7] * own[1] + turned[8] * own[2],
        ]
      : undefined;
  return {
    ...base,
    objectType: 'mesh',
    mesh: {
      asset:
        block.kind === 'Solid'
          ? solidAsset(block, properties, layoutProp, symbolDefs, sketched)
          : (asString(properties.get('asset')) ?? ''),
      role: asString(properties.get('role')),
      color: asString(properties.get('color')),
      opacity: asNumber(properties.get('opacity')),
      roughness: asNumber(properties.get('roughness')),
      metallic: asNumber(properties.get('metallic')),
      transmission: asNumber(properties.get('transmission')),
      ior: asNumber(properties.get('ior')),
      position: placed ?? mirrored(own, flip, [-1, 1, 1], [1, 1, -1]),
      rotation:
        sketched?.rotation ?? mirrored(vector(block, layoutProp, 'rotation', 0), flip, [1, -1, -1], [-1, -1, 1]),
      scale: vector(block, layoutProp, 'scale', 1),
    },
  };
}

// A place or a turn on the other side of the plane a Solid is mirrored in.
function mirrored(value: Vec3, flip: string | undefined, acrossX: Vec3, acrossZ: Vec3): Vec3 {
  const signs = flip === 'x' ? acrossX : flip === 'z' ? acrossZ : undefined;
  return signs ? [value[0] * signs[0], value[1] * signs[1], value[2] * signs[2]] : value;
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
