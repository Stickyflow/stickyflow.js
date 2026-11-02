import type { Surface } from './surfaceTypes';

const MAX_PIXELS = 1600;

function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

// A captured picture of the drawing cannot hold a shader, so a surface that reads its backdrop gets the shaders behind it here, every frame.
// They must have been drawn in this same frame, as a canvas of WebGL keeps its pixels only until then.
export function drawLiveBackdrop(surface: Surface, below: Surface[]): void {
  const svg = surface.canvas.closest('svg');
  if (!svg || !surface.backdropTexture) {
    return;
  }
  const own = surface.canvas.getBoundingClientRect();
  const behind = below
    .map(other => ({ owner: other.owner, canvas: other.canvas, box: other.canvas.getBoundingClientRect() }))
    .filter(({ canvas, box }) => canvas.width > 0 && canvas.height > 0 && overlaps(own, box));
  if (behind.length === 0) {
    return;
  }
  const area = svg.getBoundingClientRect();
  // A pane is frosted, so a smaller picture is enough for it.
  const density = surface.parameters.panel ? 0.5 : 1;
  const scale = Math.min(density, MAX_PIXELS / Math.max(1, area.width, area.height));
  const picture = surface.liveBackdrop ?? svg.ownerDocument.createElement('canvas');
  surface.liveBackdrop = picture;
  const width = Math.max(1, Math.round(area.width * scale));
  const height = Math.max(1, Math.round(area.height * scale));
  if (picture.width !== width || picture.height !== height) {
    picture.width = width;
    picture.height = height;
  }
  const context = picture.getContext('2d');
  if (!context) {
    return;
  }
  context.clearRect(0, 0, width, height);
  const drawShader = (owner: Element | undefined) => {
    const shader = behind.find(item => item.owner === owner);
    if (shader) {
      const { canvas, box } = shader;
      context.drawImage(
        canvas,
        (box.left - area.left) * scale,
        (box.top - area.top) * scale,
        box.width * scale,
        box.height * scale,
      );
    }
  };
  if (surface.backdropLayers?.length) {
    for (const layer of surface.backdropLayers) {
      drawShader(layer.on);
      context.drawImage(layer.image, 0, 0, width, height);
    }
  } else {
    for (const { owner } of behind) {
      drawShader(owner);
    }
  }
  const { gl } = surface;
  gl.bindTexture(gl.TEXTURE_2D, surface.backdropTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, picture);
}
