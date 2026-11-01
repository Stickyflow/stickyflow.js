import { DEFAULT_MESH_CANVAS, type Mesh, type MeshAnchor, type MeshCanvas } from '../../model/mesh';
import type { RenderNode } from '../scene';

// Every Canvas is a stage. Meshes that stand in no Canvas share one of their own, under everything that is drawn in 2D.
export function buildMeshStages(meshes: Mesh[], canvases: MeshCanvas[], anchors: MeshAnchor[]): RenderNode[] {
  const loose = meshes.some(mesh => !mesh.canvasId);
  return [...canvases, ...(loose ? [DEFAULT_MESH_CANVAS] : [])].map((canvas, index) => {
    const own = meshes.filter(mesh => (mesh.canvasId ?? DEFAULT_MESH_CANVAS.id) === canvas.id);
    const { id, x, y, width, height, orbit } = canvas;
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
      meshes: own,
      anchors: anchors.filter(anchor => own.some(mesh => mesh.id === anchor.mesh)),
    };
  });
}
