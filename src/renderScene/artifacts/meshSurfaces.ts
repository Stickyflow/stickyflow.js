import type { RenderInput } from '../../renderInput/types';
import type { RenderScene, SceneMeshSurface } from '../scene/types';

type Keep = (id: string) => boolean;

function filtered(input: RenderInput, keep: Keep): RenderInput {
  const entries = Object.entries(input).map(([key, value]) => {
    if (key === 'links') {
      return [key, input.links.filter(item => keep(item.link.fromId ?? '') && keep(item.link.toId ?? ''))];
    }
    const objects = Array.isArray(value) && value.every(item => typeof item?.id === 'string');
    return [key, objects ? (value as Array<{ id: string }>).filter(item => keep(item.id)) : value];
  });
  return Object.fromEntries(entries) as RenderInput;
}

// What lies on a Canvas in a Scene is not part of the 2D drawing. Each Canvas gets a drawing of its own, for a texture.
export function splitMeshSurfaces(
  input: RenderInput,
  build: (input: RenderInput) => RenderScene,
): { input: RenderInput; surfaces: SceneMeshSurface[] } {
  const declared = input.meshSurfaces ?? [];
  if (!declared.length) {
    return { input, surfaces: [] };
  }
  const onSurface = new Set(declared.flatMap(surface => surface.members.map(member => member.id)));
  const surfaces = declared.map(surface => {
    const own = new Set(surface.members.map(member => member.id));
    return {
      ...surface,
      scene: build({
        ...filtered(input, id => own.has(id)),
        meshSurfaces: [],
        diagnostics: [],
      }),
    };
  });
  return { input: filtered(input, id => !onSurface.has(id)), surfaces };
}
