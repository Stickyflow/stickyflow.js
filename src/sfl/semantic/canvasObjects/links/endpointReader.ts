import type { SflValue, Side } from '../../../ast';
import type { SflEntityOut } from '../../types';

export interface LinkEndpointReference {
  id?: string;
  side?: Side;
  fraction?: number;
  port?: string;
}

export interface LinkEndpointReaderContext {
  idByName: Map<string, string>;
  canvasObjectById: Map<string, SflEntityOut>;
}

function namedPortReference(segments: string[], context: LinkEndpointReaderContext): LinkEndpointReference | null {
  if (segments.length < 2) {
    return null;
  }

  const portName = segments[segments.length - 1];
  const canvasObjectName = segments[segments.length - 2];
  const canvasObjectId = context.idByName.get(canvasObjectName);
  const canvasObject = canvasObjectId ? context.canvasObjectById.get(canvasObjectId) : undefined;
  if (!canvasObject?.symbol?.ports?.some(port => port.name === portName)) {
    return null;
  }

  return { id: canvasObjectId, port: portName };
}

export function readLinkEndpoint(
  value: SflValue | undefined,
  context: LinkEndpointReaderContext,
): LinkEndpointReference {
  if (value?.type !== 'endpoint') {
    return {};
  }

  const namedPort = namedPortReference(value.segments, context);
  if (namedPort) {
    return namedPort;
  }

  const endpointName = value.segments[value.segments.length - 1];
  return {
    id: context.idByName.get(endpointName) ?? endpointName,
    side: value.side,
    fraction: value.fraction,
  };
}
