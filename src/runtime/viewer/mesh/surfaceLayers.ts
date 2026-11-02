const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const GRAPHICS = 'rect,path,ellipse,circle,line,polygon,polyline,text,image,foreignObject';

export type SurfaceLayer = { svg: string } | { shader: Element };

const fetched = new Map<string, Promise<string>>();

function dataUrl(address: string): Promise<string> {
  let known = fetched.get(address);
  if (!known) {
    known = fetch(address)
      .then(response => {
        if (!response.ok) {
          throw new Error(`${address}: ${response.status}`);
        }
        return response.blob();
      })
      .then(
        blob =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
      );
    fetched.set(address, known);
  }
  return known;
}

// A picture made from SVG loads nothing from outside, so its fonts and images have to travel with it.
async function fontsOf(page: Document, root: Element): Promise<string> {
  const used = [...root.querySelectorAll('[font-family]')]
    .map(node => node.getAttribute('font-family') ?? '')
    .join(',');
  const faces: Promise<string>[] = [];
  for (const sheet of page.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of rules) {
      if (rule.constructor.name !== 'CSSFontFaceRule') {
        continue;
      }
      const { style } = rule as CSSFontFaceRule;
      const family = style.getPropertyValue('font-family').replace(/['"]/g, '');
      const address = /url\(["']?([^"')]+)["']?\)/.exec(style.getPropertyValue('src'))?.[1];
      if (!address || !used.includes(family)) {
        continue;
      }
      const absolute = new URL(address, sheet.href ?? page.baseURI).href;
      faces.push(
        dataUrl(absolute)
          .then(
            data =>
              `@font-face{font-family:"${family}";font-weight:${style.getPropertyValue('font-weight') || 'normal'};font-style:${style.getPropertyValue('font-style') || 'normal'};src:url(${data})}`,
          )
          .catch(() => ''),
      );
    }
  }
  return (await Promise.all(faces)).join('');
}

async function inlineImages(root: Element): Promise<void> {
  await Promise.all(
    [...root.querySelectorAll('image')].map(async image => {
      const href = image.getAttribute('href');
      if (href && !href.startsWith('data:')) {
        image.setAttribute('href', await dataUrl(new URL(href, root.ownerDocument.baseURI).href));
      }
    }),
  );
}

function chunk(root: Element, previous: number, next: number): string | undefined {
  const clone = root.cloneNode(true) as Element;
  const definitions = [...clone.querySelectorAll('defs')];
  const shaders = [...clone.querySelectorAll('foreignObject[data-sf-shader]')];
  for (const definition of definitions) {
    definition.remove();
  }
  const range = clone.ownerDocument.createRange();
  if (shaders[next]) {
    range.setStartBefore(shaders[next]);
    range.setEnd(clone, clone.childNodes.length);
    range.deleteContents();
  }
  if (shaders[previous]) {
    range.setStart(clone, 0);
    range.setEndAfter(shaders[previous]);
    range.deleteContents();
  }
  for (const shader of clone.querySelectorAll('foreignObject[data-sf-shader]')) {
    shader.remove();
  }
  if (!clone.querySelector(GRAPHICS)) {
    return undefined;
  }
  clone.prepend(...definitions);
  return new XMLSerializer().serializeToString(clone);
}

// The drawing of a Canvas, cut at each shader, as a shader is no picture. The parts lie on the Canvas in their order.
export async function surfaceLayers(
  svg: string,
  width: number,
  height: number,
  page: Document,
  prepare: (root: Element) => void,
): Promise<SurfaceLayer[]> {
  const parsed = new DOMParser().parseFromString(svg.replace(/^<\?xml[^>]*\?>\s*/, ''), 'image/svg+xml');
  const root = parsed.documentElement;
  root.setAttribute('viewBox', `0 0 ${width} ${height}`);
  root.setAttribute('xmlns', SVG_NAMESPACE);
  prepare(root);
  await inlineImages(root);
  const fonts = await fontsOf(page, root);
  if (fonts) {
    const definitions = parsed.createElementNS(SVG_NAMESPACE, 'defs');
    const style = parsed.createElementNS(SVG_NAMESPACE, 'style');
    style.textContent = fonts;
    definitions.append(style);
    root.prepend(definitions);
  }
  const shaders = [...root.querySelectorAll('foreignObject[data-sf-shader]')];
  const layers: SurfaceLayer[] = [];
  for (let index = 0; index <= shaders.length; index++) {
    const part = chunk(root, index - 1, index);
    if (part) {
      layers.push({ svg: part });
    }
    if (shaders[index]) {
      layers.push({ shader: shaders[index] });
    }
  }
  return layers;
}

export async function rasterize(
  svg: string,
  width: number,
  height: number,
  page: Document,
): Promise<HTMLCanvasElement> {
  const sized = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  sized.setAttribute('width', String(width));
  sized.setAttribute('height', String(height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(sized)], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = page.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
