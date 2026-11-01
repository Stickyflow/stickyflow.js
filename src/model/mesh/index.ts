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
  canvasId?: string;
  sourceIndex?: number;
}

// The place on the 2D drawing where a 3D world is seen, and where its camera starts: around the world and up, in degrees.
export interface MeshCanvas {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  orbit: [number, number];
}

// A 2D object that follows a point of a mesh. Its own position is then its distance from that point.
export interface MeshAnchor {
  objectId: string;
  mesh: string;
  point: Vec3;
}

export const DEFAULT_ORBIT: [number, number] = [45, 27];
export const DEFAULT_MESH_CANVAS: MeshCanvas = {
  id: 'mesh-world-default',
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  orbit: DEFAULT_ORBIT,
};
