import { DEFAULT_MESH_SCENE, type Mesh, type MeshAnchor, type MeshLight, type MeshScene } from '../../model/mesh';
import type { RenderNode } from '../scene';
import type { SceneMeshSurface } from '../scene/types';

// Every Scene is a stage. Meshes that stand in no Scene share one of their own, under everything that is drawn in 2D.
export function buildMeshStages(
  meshes: Mesh[],
  canvases: MeshScene[],
  anchors: MeshAnchor[],
  surfaces: SceneMeshSurface[],
  lights: MeshLight[],
): RenderNode[] {
  const loose = meshes.some(mesh => !mesh.sceneId) || surfaces.some(surface => !surface.sceneId);
  return [...canvases, ...(loose ? [DEFAULT_MESH_SCENE] : [])].map((canvas, index) => {
    const own = meshes.filter(mesh => (mesh.sceneId ?? DEFAULT_MESH_SCENE.id) === canvas.id);
    const { id, x, y, width, height, orbit, shadow } = canvas;
    return {
      type: 'mesh-stage',
      id: `mesh-stage-${id}`,
      order: -1000 + index,
      bounds: { minX: x, minY: y, maxX: x + width, maxY: y + height },
      x,
      y,
      width,
      height,
      stageId: id,
      orbit,
      shadow,
      meshes: own,
      light: lights.find(light => (light.sceneId ?? DEFAULT_MESH_SCENE.id) === canvas.id),
      surfaces: surfaces.filter(surface => (surface.sceneId ?? DEFAULT_MESH_SCENE.id) === canvas.id),
      anchors: anchors.filter(anchor => own.some(mesh => mesh.id === anchor.mesh)),
    };
  });
}
