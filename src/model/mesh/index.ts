export type Vec3 = [number, number, number];

// A part from an external asset, placed in a 3D world. Rotation is in degrees, about x, then y, then z.
export interface Mesh {
  id: string;
  asset: string;
  role?: string;
  color?: string;
  opacity: number;
  roughness?: number;
  metallic?: number;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  sceneId?: string;
  sourceIndex?: number;
}

// The place on the 2D drawing where a 3D world is seen, and where its camera starts: around the world and up, in degrees.
export interface MeshScene {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  orbit: [number, number];
  shadow: boolean;
  // What lights the world and is seen in its reflections: "studio", or the address of an .hdr or an equirectangular picture.
  environment?: string;
  // How far the environment is turned about the vertical, in degrees.
  environmentTurn?: number;
  // Brighter or darker than usual, in stops: 1 is twice as bright.
  exposure?: number;
  order?: number;
}

// A 2D object that follows a point of a mesh. Its own position is then its distance from that point.
export interface MeshAnchor {
  objectId: string;
  mesh: string;
  point: Vec3;
}

// What a binding can reach on a Mesh, a Canvas in a Scene or a Light.
type MeshValues = Partial<
  Pick<Mesh, 'position' | 'rotation' | 'scale' | 'color' | 'opacity' | 'roughness' | 'metallic'> &
    Pick<MeshLight, 'turn' | 'height' | 'intensity' | 'ambient' | 'softness'>
>;

const NUMBERS = ['opacity', 'roughness', 'metallic', 'turn', 'height', 'intensity', 'ambient', 'softness'] as const;

const AXES: Record<string, ['position' | 'rotation' | 'scale', number]> = {
  positionX: ['position', 0],
  positionY: ['position', 1],
  positionZ: ['position', 2],
  rotationX: ['rotation', 0],
  rotationY: ['rotation', 1],
  rotationZ: ['rotation', 2],
  scaleX: ['scale', 0],
  scaleY: ['scale', 1],
  scaleZ: ['scale', 2],
};

// Writes one value that a binding can reach. A renderer and a live update use the same rule.
export function setMeshValue(mesh: MeshValues, property: string, value: unknown): void {
  const axis = AXES[property];
  const number = NUMBERS.find(name => name === property);
  const vector = axis && mesh[axis[0]];
  if (vector) {
    vector[axis[1]] = value as number;
  } else if (property === 'scale') {
    mesh.scale = [value as number, value as number, value as number];
  } else if (property === 'color') {
    mesh.color = value as string;
  } else if (number) {
    mesh[number] = value as number;
  }
}

// Something on a Canvas, in the units of that Canvas.
export interface MeshSurfaceMember {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// A surface in a 3D world with ordinary objects on it. 100 of its units are one unit of the world, before its scale.
export interface MeshSurface {
  id: string;
  sceneId?: string;
  width: number;
  height: number;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  members: MeshSurfaceMember[];
}

// The sun of a Scene. Its turn goes round from the front and its height up from the horizon, both in degrees.
export interface MeshLight {
  id: string;
  sceneId?: string;
  turn: number;
  height: number;
  color?: string;
  intensity: number;
  ambient: number;
  // How large the sun looks, in degrees: the shadows get softer the further they fall. Without it they are as sharp as the map allows.
  softness?: number;
}

export const DEFAULT_LIGHT: MeshLight = { id: 'light-default', turn: 57.5, height: 49, intensity: 1, ambient: 1 };

export const DEFAULT_ORBIT: [number, number] = [45, 27];
export const DEFAULT_MESH_SCENE: MeshScene = {
  id: 'mesh-world-default',
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  orbit: DEFAULT_ORBIT,
  shadow: false,
};
