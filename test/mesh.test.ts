import { describe, expect, it } from 'vitest';
import { createBindingRuntime, createDataSource } from '../src/binding';
import { canonicalize, render, sflToCanvasState } from '../src/index';
import { setMeshValue } from '../src/model/mesh';
import { applyMeshChange, insertCanvasObject } from '../src/runtime/interaction';
import { parseMeshAsset } from '../src/runtime/viewer/mesh/glb';
import { modelMatrix, transformPoint } from '../src/runtime/viewer/mesh/matrix';

const scene = `sfl 1.8

DataSource arm {
  mode: record
  fields {
    angle: number
  }
}

Model scene {
  Scene world {
    orbit: 30, 20
    shadow: true
    layout {
      position: 40, 40
      size: 760, 600
      order: 2
    }

    Mesh robot {
      asset: "robot.glb"
      style {
        color: "#d9d9d9"
        roughness: 0.3
      }
      layout {
        position: 1, 2, 3
        rotationY: <- arm.angle
        scale: 2
      }
    }

    Shape tag {
      text: "Head"
      anchor: robot
      anchorAt: 0, 2, 0
      layout {
        position: 10, -18
        size: 70, 28
      }
    }
  }
}
`;

const stageOf = (svg: string) => {
  const data = /data-sf-mesh-stage="([^"]*)"/.exec(svg)?.[1] ?? '';
  return JSON.parse(data.replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
};

describe('Mesh and Canvas', () => {
  it('goes from text to a stage', () => {
    const { svg, diagnostics } = render(scene);
    expect(diagnostics).toEqual([]);
    const stage = stageOf(svg);
    expect(stage).toMatchObject({ id: 'world', orbit: [30, 20], shadow: true });
    expect(stage.meshes[0]).toMatchObject({ id: 'robot', position: [1, 2, 3], scale: [2, 2, 2], roughness: 0.3 });
    expect(stage.anchors).toEqual([{ objectId: 'tag', mesh: 'robot', point: [0, 2, 0] }]);
  });

  it('keeps its form when it is formatted, also a binding in a layout', () => {
    const once = canonicalize(scene);
    expect(canonicalize(once)).toBe(once);
    expect(once).toContain('rotationY: <- arm.angle');
  });

  it('gives every Canvas a stage of its own, and loose meshes one more', () => {
    const { svg } = render(`sfl 1.8

Model m {
  Mesh loose {
    asset: "a.glb"
  }
  Scene one {
    layout {
      position: 0, 0
      size: 10, 10
    }
    Mesh a {
      asset: "a.glb"
    }
  }
  Scene two {
    layout {
      position: 20, 0
      size: 10, 10
    }
    Mesh b {
      asset: "a.glb"
    }
  }
}
`);
    expect(svg.match(/data-sf-mesh-stage=/g)).toHaveLength(3);
  });

  it('warns about a Mesh that would not be drawn', () => {
    const codes = (source: string) => render(source).diagnostics.map(diagnostic => diagnostic.code);
    expect(codes('sfl 1.8\n\nMesh a {\n  asset: "x.glb"\n}\n\nModel m {\n}\n')).toEqual(['mesh-outside-model']);
    expect(codes('sfl 1.8\n\nModel a {\n  asset: "x.glb"\n}\n')).toEqual(['model-with-asset']);
    expect(codes('sfl 1.8\n\nModel a {\n  Mesh b {\n  }\n}\n')).toEqual(['mesh-without-asset']);
  });

  it('sends a bound value straight to the stage, without a new drawing', () => {
    const runtime = createBindingRuntime(scene);
    expect(runtime.diagnostics).toEqual([]);
    const live: unknown[] = [];
    let drawings = 0;
    runtime.attach({
      update: () => {
        drawings++;
      },
      setMeshValue: (...change: unknown[]) => live.push(change),
    });
    runtime.registerSource('arm', createDataSource({ angle: 75 } as never));
    runtime.flush();
    expect(live).toEqual([['robot', 'rotationY', 75]]);
    expect(drawings).toBe(0);
  });

  it('writes what the handles did into the layout', () => {
    const moved = applyMeshChange(scene, { id: 'robot', position: [0.584, 0, 1], scale: [3, 3, 3] });
    expect(moved).toContain('position: 0.584, 0, 1');
    expect(moved).toContain('scale: 3, 3, 3');
    expect(moved).toContain('rotationY: <- arm.angle');
  });

  it('inserts next to a Mesh, not into it', () => {
    const added = insertCanvasObject(scene, { id: 'n', kind: 'shape', text: 'x', x: 1, y: 1, width: 5, height: 5 });
    expect(sflToCanvasState(added).canvasObjects.map(object => object.id)).toEqual(['world', 'robot', 'tag', 'n']);
  });

  it('sets one value of a mesh by its name', () => {
    const mesh = {
      id: 'm',
      asset: '',
      opacity: 1,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    } as never;
    setMeshValue(mesh, 'positionZ', 4);
    setMeshValue(mesh, 'scale', 2);
    setMeshValue(mesh, 'color', '#ffffff');
    expect(mesh).toMatchObject({ position: [0, 0, 4], scale: [2, 2, 2], color: '#ffffff' });
  });
});

describe('a Canvas in a Scene', () => {
  const panel = `sfl 1.8

DataSource arm {
  mode: record
  fields {
    angle: number
  }
}

Model m {
  Scene world {
    layout {
      position: 40, 40
      size: 600, 400
    }
    Mesh robot {
      asset: "robot.glb"
    }
    Canvas board {
      layout {
        position: 1, 2, 3
        rotationY: <- arm.angle
        size: 200, 100
        scale: 2
      }
      Text title {
        text: "On the board"
        layout {
          position: 10, 20
          size: 150, 30
        }
      }
    }
    Shape over {
      text: "Over it"
      layout {
        position: 10, 10
        size: 50, 20
      }
    }
  }
}
`;

  it('takes what lies on it out of the drawing and keeps its own coordinates', () => {
    const { svg, diagnostics } = render(panel);
    expect(diagnostics).toEqual([]);
    const [surface] = stageOf(svg).surfaces;
    expect(surface).toMatchObject({ id: 'board', sceneId: 'world', width: 200, height: 100, position: [1, 2, 3] });
    expect(surface.scale).toEqual([2, 2, 2]);
    expect(surface.members).toEqual([{ id: 'title', x: 10, y: 20, width: 150, height: 30 }]);
    expect(surface.svg).toContain('On the board');
    expect(svg.replace(/data-sf-mesh-stage="[^"]*"/, '')).not.toContain('On the board');
    expect(svg).toContain('Over it');
  });

  it('moves live, like a Mesh', () => {
    const runtime = createBindingRuntime(panel);
    expect(runtime.diagnostics).toEqual([]);
    const live: unknown[] = [];
    runtime.attach({ update: () => undefined, setMeshValue: (...change: unknown[]) => live.push(change) });
    runtime.registerSource('arm', createDataSource({ angle: 30 } as never));
    runtime.flush();
    expect(live).toEqual([['board', 'rotationY', 30]]);
  });

  it('writes what the handles did into its layout', () => {
    expect(applyMeshChange(panel, { id: 'board', position: [4, 5, 6] })).toContain('position: 4, 5, 6');
  });

  it('warns about a Mesh on it, which is flat', () => {
    const source =
      'sfl 1.8\n\nModel m {\n  Scene s {\n    Canvas c {\n      Mesh a {\n        asset: "x.glb"\n      }\n    }\n  }\n}\n';
    expect(render(source).diagnostics.map(diagnostic => diagnostic.code)).toEqual(['mesh-on-canvas']);
  });

  it('leaves a drawing without a Scene as it was', () => {
    const plain =
      'sfl 1.8\n\nModel m {\n  Shape a {\n    layout {\n      position: 0, 0\n      size: 10, 10\n    }\n  }\n}\n';
    expect(render(plain).svg).not.toContain('data-sf-mesh-stage');
  });
});

describe('the reader of glTF', () => {
  const triangle = () => {
    const buffer = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const uri = `data:application/octet-stream;base64,${Buffer.from(buffer.buffer).toString('base64')}`;
    return {
      asset: { version: '2.0' },
      buffers: [{ uri, byteLength: 36 }],
      bufferViews: [{ buffer: 0, byteLength: 36 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      nodes: [
        { children: [1], translation: [1, 0, 0] },
        { mesh: 0, scale: [2, 2, 2] },
      ],
      scenes: [{ nodes: [0] }],
      animations: [{}],
    };
  };
  const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).buffer as ArrayBuffer;

  it('follows the nodes and works out missing normals', async () => {
    const { primitives, skipped } = await parseMeshAsset(bytes(triangle()));
    expect(primitives).toHaveLength(1);
    expect([...primitives[0].normals.slice(0, 3)]).toEqual([0, 0, 1]);
    expect(transformPoint(primitives[0].transform, [1, 0, 0])).toEqual([3, 0, 0]);
    expect(skipped).toEqual(['animations']);
  });

  it('says so when a file is none, or needs what is not there', async () => {
    await expect(parseMeshAsset(new TextEncoder().encode('nope').buffer as ArrayBuffer)).rejects.toThrow(
      'neither a GLB nor a glTF',
    );
    await expect(
      parseMeshAsset(bytes({ ...triangle(), extensionsRequired: ['KHR_draco_mesh_compression'] })),
    ).rejects.toThrow('not supported');
  });
});

describe('the place of a mesh', () => {
  it('turns about x, then y, then z', () => {
    const [x, y, z] = transformPoint(modelMatrix([0, 0, 0], [0, 90, 0], [1, 1, 1]), [1, 0, 0]);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(-1);
  });
});
