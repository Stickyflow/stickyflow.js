import type { ShapeImage } from '../../../model/shape';
import type { RenderDiagnostic, RenderNode, SceneClip } from '../../scene';
import type { ShapeRenderContext } from './types';

type Box = { x: number; y: number; width: number; height: number };

function clipOf(outline: RenderNode | undefined, box: Box): SceneClip {
  if (outline?.type === 'path') {
    return { type: 'path', d: outline.d };
  }
  if (outline?.type === 'ellipse') {
    const { cx, cy, rx, ry } = outline;
    return {
      type: 'path',
      d: `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`,
    };
  }
  return { type: 'rect', ...box, rx: outline?.type === 'rect' ? (outline.rx ?? 0) : 0 };
}

// The whole file, placed so that the part to show lands in the box the way the fit asks for.
function croppedBox(image: ShapeImage, crop: NonNullable<ShapeImage['crop']>, pixels: [number, number], box: Box): Box {
  const scaleX = box.width / crop.width;
  const scaleY = box.height / crop.height;
  const scale = image.fit === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
  const [sx, sy] = image.fit === 'fill' ? [scaleX, scaleY] : [scale, scale];
  return {
    x: box.x + (box.width - crop.width * sx) / 2 - crop.x * sx,
    y: box.y + (box.height - crop.height * sy) / 2 - crop.y * sy,
    width: pixels[0] * sx,
    height: pixels[1] * sy,
  };
}

const ASPECTS = { cover: 'slice', contain: 'meet', fill: 'none' } as const;

export function renderShapeImage(
  context: ShapeRenderContext,
  outline: RenderNode | undefined,
  diagnostics: RenderDiagnostic[],
): RenderNode | undefined {
  const image = context.shape.image;
  if (!image) {
    return undefined;
  }
  if (image.crop && !image.pixels) {
    diagnostics.push({
      severity: 'warning',
      code: 'image-crop-without-size',
      ownerId: context.shape.id,
      message: `The image '${context.shape.id}' has a crop but no imageSize, so it is shown uncropped. Give it the size of the file, as imageSize: width, height.`,
    });
  }
  const box = { x: context.x, y: context.y, width: context.width, height: context.height };
  const cropped = image.crop && image.pixels;
  return {
    type: 'image',
    id: `${context.id}-image`,
    order: context.order,
    bounds: context.bounds,
    ...(cropped ? croppedBox(image, image.crop!, image.pixels!, box) : box),
    href: image.src,
    aspect: cropped ? 'none' : ASPECTS[image.fit],
    rotation: context.rotation,
    rotationCenter: context.rotationCenter,
    style: {
      opacity: context.style.opacity,
      blur: context.style.blur,
      blend: context.style.blend,
      clip: clipOf(outline, box),
      pointerEvents: 'none',
    },
  };
}
