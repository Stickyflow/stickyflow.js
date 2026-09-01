import type { ShadowStyle } from '../../../model/shadows';

function applyShadowProperty(shadow: ShadowStyle, key: string, value: string): void {
  switch (key) {
    case 'color':
      shadow.color = value;
      break;
    case 'opacity':
      shadow.opacity = Number(value);
      break;
    case 'blur':
      shadow.blur = Number(value);
      break;
    case 'angle':
      shadow.angle = Number(value);
      break;
    case 'distance':
      shadow.distance = Number(value);
      break;
  }
}

export function decodeShadow(source?: string): ShadowStyle | undefined {
  if (!source) {
    return undefined;
  }
  if (source === 'on') {
    return { enabled: true };
  }
  const match = source.match(/^shadow\((.*)\)\s*$/);
  if (!match) {
    return undefined;
  }

  const shadow: ShadowStyle = { enabled: true };
  for (const part of match[1].split(',')) {
    const keyValue = part.split(':');
    if (keyValue.length !== 2) {
      continue;
    }
    applyShadowProperty(shadow, keyValue[0].trim(), keyValue[1].trim());
  }
  return shadow;
}
