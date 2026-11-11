import type { Mesh, MeshAnchor } from '../../../model/mesh';
import type { Camera } from './camera';
import { modelMatrix, transformPoint } from './matrix';
import type { DrawingPoint } from './stageView';

const OCCLUDED_OPACITY = '0.18';

// Moves the 2D objects that follow a point of a mesh, and fades those that a mesh stands in front of.
export class StageAnchors {
  private readonly svg: SVGSVGElement;
  private readonly originals = new WeakMap<Element, { written: string; original: string | null }>();
  // Whether each anchored object is behind a mesh, for the view it was last worked out in. It only changes when the camera or a
  // mesh moves, and asking costs a read from the GPU.
  private readonly hidden = new Map<string, boolean>();
  private view = '';

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
  }

  place(
    anchors: readonly MeshAnchor[],
    meshes: readonly Mesh[],
    camera: Camera | undefined,
    toStage: (point: readonly number[]) => DrawingPoint | undefined,
    occluded: (world: readonly number[]) => boolean,
  ): void {
    if (!camera || anchors.length === 0) {
      return;
    }
    const view = `${camera.eye.join()}|${camera.window.join()}|${meshes
      .map(mesh => `${mesh.position.join()}/${mesh.rotation.join()}/${mesh.scale.join()}/${mesh.asset}`)
      .join('|')}`;
    if (view !== this.view) {
      this.view = view;
      this.hidden.clear();
    }
    for (const anchor of anchors) {
      const mesh = meshes.find(candidate => candidate.id === anchor.mesh);
      const world = mesh && transformPoint(modelMatrix(mesh.position, mesh.rotation, mesh.scale), anchor.point);
      const at = world && toStage(world);
      if (!world || !at) {
        continue;
      }
      let hidden = this.hidden.get(anchor.objectId);
      if (hidden === undefined) {
        hidden = occluded(world);
        this.hidden.set(anchor.objectId, hidden);
      }
      for (const node of this.svg.querySelectorAll(`[data-sf-id="${CSS.escape(anchor.objectId)}"]`)) {
        const current = node.getAttribute('transform');
        const known = this.originals.get(node);
        const original = known && known.written === current ? known.original : current;
        const written = `translate(${at.x} ${at.y})${original ? ` ${original}` : ''}`;
        node.setAttribute('transform', written);
        this.originals.set(node, { written, original });
        (node as SVGElement).style.opacity = hidden ? OCCLUDED_OPACITY : '';
      }
    }
  }
}
