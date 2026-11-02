import { describe, expect, it } from 'vitest';
import { createBindingRuntime, createDataSource } from '../src/binding';
import { canonicalize, render, sflToCanvasState } from '../src/index';
import { DEFAULT_LIGHT, setMeshValue } from '../src/model/mesh';
import { applyMeshChange, applyMeshObjectChange, insertCanvasObject } from '../src/runtime/interaction';
import { parseMeshAsset } from '../src/runtime/viewer/mesh/glb';
import { lightingOf } from '../src/runtime/viewer/mesh/lighting';
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

  it('writes what is moved on it into the layout of that object', () => {
    const moved = applyMeshObjectChange(panel, { id: 'title', x: 25, y: 40, width: 120, height: 32 });
    expect(moved).toContain('position: 25, 40');
    expect(moved).toContain('size: 120, 32');
    expect(moved).toContain('position: 1, 2, 3');
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

describe('a Light in a Scene', () => {
  const sunny = `sfl 1.8

DataSource day {
  mode: record
  fields {
    sun: number
  }
}

Model m {
  Scene world {
    layout {
      position: 0, 0
      size: 400, 300
    }
    Light sun {
      turn: 120
      height: <- day.sun
      color: "#ffcc88"
      intensity: 1.5
      ambient: 0.5
    }
    Mesh a {
      asset: "a.glb"
    }
  }
}
`;

  it('reaches the stage, and only that', () => {
    const { svg, diagnostics } = render(sunny);
    expect(diagnostics).toEqual([]);
    expect(stageOf(svg).light).toMatchObject({
      id: 'sun',
      sceneId: 'world',
      turn: 120,
      color: '#ffcc88',
      intensity: 1.5,
      ambient: 0.5,
    });
  });

  it('moves live', () => {
    const runtime = createBindingRuntime(sunny);
    expect(runtime.diagnostics).toEqual([]);
    const live: unknown[] = [];
    runtime.attach({ update: () => undefined, setMeshValue: (...change: unknown[]) => live.push(change) });
    runtime.registerSource('day', createDataSource({ sun: 12 } as never));
    runtime.flush();
    expect(live).toEqual([['sun', 'height', 12]]);
  });

  it('warns about a second one', () => {
    const source = 'sfl 1.8\n\nModel m {\n  Scene s {\n    Light a {\n    }\n    Light b {\n    }\n  }\n}\n';
    expect(render(source).diagnostics.map(diagnostic => diagnostic.code)).toEqual(['extra-light']);
  });
});

describe('what the sun does to the light', () => {
  it('is warm and weak when low, and gone below the horizon', () => {
    const noon = lightingOf({ ...DEFAULT_LIGHT, height: 80 });
    const dusk = lightingOf({ ...DEFAULT_LIGHT, height: 5 });
    const night = lightingOf({ ...DEFAULT_LIGHT, height: -30 });
    expect(dusk.sun[0] / dusk.sun[2]).toBeGreaterThan(noon.sun[0] / noon.sun[2]);
    expect(dusk.sky[2]).toBeLessThan(noon.sky[2]);
    expect(night.sun).toEqual([0, 0, 0]);
    expect(night.shadow).toBe(0);
  });

  it('turns from the front toward x', () => {
    const [x, , z] = lightingOf({ ...DEFAULT_LIGHT, turn: 90, height: 0 }).direction;
    expect(x).toBeCloseTo(1);
    expect(z).toBeCloseTo(0);
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
      'neither GLB, glTF, STL nor OBJ',
    );
    await expect(
      parseMeshAsset(bytes({ ...triangle(), extensionsRequired: ['KHR_draco_mesh_compression'] })),
    ).rejects.toThrow('not supported');
  });
});

describe('materials and other formats', () => {
  const buffer = () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    return `data:application/octet-stream;base64,${Buffer.from(positions.buffer).toString('base64')}`;
  };
  const text = (value: string) => new TextEncoder().encode(value).buffer as ArrayBuffer;

  it('keeps every map of a material, with its numbers', async () => {
    const file = {
      asset: { version: '2.0' },
      buffers: [{ uri: buffer(), byteLength: 36 }],
      bufferViews: [{ buffer: 0, byteLength: 36 }],
      accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }],
      images: [{ uri: 'a.png' }, { uri: 'b.png' }, { uri: 'c.png' }, { uri: 'd.png' }, { uri: 'e.png' }],
      samplers: [{ wrapS: 33071 }],
      textures: [{ source: 0, sampler: 0 }, { source: 1 }, { source: 2 }, { source: 3 }, { source: 4 }],
      materials: [
        {
          pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 2 } },
          normalTexture: { index: 1, scale: 0.5 },
          occlusionTexture: { index: 3, strength: 0.25 },
          emissiveTexture: { index: 4 },
          emissiveFactor: [1, 0.5, 0],
        },
      ],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
      nodes: [{ mesh: 0 }],
    };
    const { primitives } = await parseMeshAsset(
      new TextEncoder().encode(JSON.stringify(file)).buffer as ArrayBuffer,
      '/m/',
    );
    const { maps, normalScale, occlusionStrength, emissive } = primitives[0].material;
    expect(maps.base).toEqual({ image: '/m/a.png', sampler: { wrapS: 33071 } });
    expect(maps.normal?.image).toBe('/m/b.png');
    expect(maps.surface?.image).toBe('/m/c.png');
    expect(maps.occlusion?.image).toBe('/m/d.png');
    expect(maps.emissive?.image).toBe('/m/e.png');
    expect({ normalScale, occlusionStrength, emissive }).toEqual({
      normalScale: 0.5,
      occlusionStrength: 0.25,
      emissive: [1, 0.5, 0],
    });
  });

  it('reads a binary STL', async () => {
    const data = new ArrayBuffer(84 + 50);
    const view = new DataView(data);
    view.setUint32(80, 1, true);
    [1, 0, 0, 0, 1, 0].forEach((value, index) => {
      view.setFloat32(84 + 12 + 12 + index * 4, value, true);
    });
    const { primitives } = await parseMeshAsset(data);
    expect([...primitives[0].positions]).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect([...primitives[0].normals.slice(0, 3)]).toEqual([0, 0, 1]);
    expect(primitives[0].material.metallic).toBe(0);
  });

  it('reads an STL in text', async () => {
    const stl =
      'solid a\n facet normal 0 0 1\n  outer loop\n   vertex 0 0 0\n   vertex 1 0 0\n   vertex 0 1 0\n  endloop\n endfacet\nendsolid a\n';
    const { primitives } = await parseMeshAsset(text(stl));
    expect(primitives[0].positions).toHaveLength(9);
  });

  it('reads an OBJ, with a face of four corners and counting from the end', async () => {
    const obj =
      'mtllib a.mtl\nv 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nvt 0 0\nvn 0 0 1\nf 1/1/1 2/1/1 3/1/1 4/1/1\nf -4 -3 -2\n';
    const { primitives, skipped } = await parseMeshAsset(text(obj));
    expect(primitives[0].positions).toHaveLength(27);
    expect(primitives[0].uvs).toBeUndefined();
    expect([...primitives[0].normals.slice(0, 3)]).toEqual([0, 0, 1]);
    expect(skipped).toEqual(['materials']);
  });

  it('says so when an OBJ names a vertex that is not there', async () => {
    await expect(parseMeshAsset(text('v 0 0 0\nf 1 2 3\n'))).rejects.toThrow('not there');
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
