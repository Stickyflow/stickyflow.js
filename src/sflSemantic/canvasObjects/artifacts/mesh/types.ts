import type { Vec3 } from '../../../../model/mesh';

export interface SflMeshData {
  asset: string;
  role?: string;
  color?: string;
  opacity?: number;
  roughness?: number;
  metallic?: number;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface SflMeshSceneData {
  orbit: [number, number];
  shadow: boolean;
}

export interface SflMeshSurfaceData {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface SflMeshLightData {
  turn: number;
  height: number;
  color?: string;
  intensity: number;
  ambient: number;
}

export interface SflAnchorData {
  mesh: string;
  point: Vec3;
}
