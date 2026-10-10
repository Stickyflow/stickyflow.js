import { readViewBox } from '../display/svgDocument';
import type { ViewerImageExportOptions } from './types';

function positive(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function loadImage(document: Document, source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const ImageConstructor = document.defaultView?.Image;
    if (!ImageConstructor) {
      reject(new Error('viewer export: Image is unavailable in this environment.'));
      return;
    }
    const image = new ImageConstructor();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('viewer export: the SVG snapshot could not be decoded.'));
    image.src = source;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number | undefined): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`viewer export: ${mimeType} encoding failed.`));
        }
      },
      mimeType,
      quality,
    );
  });
}

export async function rasterizeSvgSnapshot(
  svg: SVGSVGElement,
  snapshot: string,
  options: ViewerImageExportOptions = {},
): Promise<Blob> {
  const viewBox = readViewBox(svg);
  const scale = positive(options.scale, 1);
  const width = Math.max(1, Math.round(viewBox.w * scale));
  const height = Math.max(1, Math.round(viewBox.h * scale));
  const canvas = svg.ownerDocument.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('viewer export: a 2D canvas context is unavailable.');
  }
  const blob = new Blob([snapshot], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(svg.ownerDocument, url);
    const background = options.backgroundColor ?? (options.format === 'jpeg' ? '#ffffff' : undefined);
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);
    const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return await canvasBlob(canvas, mimeType, options.quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
