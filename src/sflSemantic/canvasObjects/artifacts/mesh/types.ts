import type { Vec3 } from '../../../../model/mesh';

export interface SflMeshData {
  asset: string;
  role?: string;
  color?: string;
  opacity?: number;
  roughness?: number;
  metallic?: number;
  transmission?: number;
  ior?: number;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface SflMeshSceneData {
  orbit: [number, number];
  zoom?: number;
  shadow: boolean;
  environment?: string;
  environmentTurn?: number;
  exposure?: number;
  haze?: number;
  hazeColor?: string;
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
  softness?: number;
  ambientColor?: string;
  position?: Vec3;
  glow?: number;
}

export interface SflMeshGroundData {
  height?: number;
  color?: string;
  reflection: number;
  roughness: number;
}

export interface SflAnchorData {
  mesh: string;
  point: Vec3;
}
