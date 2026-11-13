import type { BlockKind } from '../sflLanguage/ast';
import type { BindingType } from './types';

const PLACE: Record<string, BindingType> = {
  x: 'number',
  y: 'number',
  width: 'number',
  height: 'number',
  visible: 'boolean',
};

const MESH: Record<string, BindingType> = {
  color: 'string',
  opacity: 'number',
  roughness: 'number',
  metallic: 'number',
  positionX: 'number',
  positionY: 'number',
  positionZ: 'number',
  rotationX: 'number',
  rotationY: 'number',
  rotationZ: 'number',
  scale: 'number',
  scaleX: 'number',
  scaleY: 'number',
  scaleZ: 'number',
};

export const BINDABLE_PROPERTIES: Partial<Record<BlockKind, Record<string, BindingType>>> = {
  Chart: { categories: { list: 'string' }, text: 'string' },
  Series: { values: { list: 'number' }, label: 'string' },
  Shape: {
    text: 'string',
    fill: 'string',
    stroke: 'string',
    textColor: 'string',
    opacity: 'number',
    ...PLACE,
  },
  Image: { opacity: 'number', ...PLACE },
  Path: { stroke: 'string', opacity: 'number', visible: 'boolean' },
  Light: {
    turn: 'number',
    height: 'number',
    color: 'string',
    intensity: 'number',
    ambient: 'number',
  },
  Canvas: {
    positionX: 'number',
    positionY: 'number',
    positionZ: 'number',
    rotationX: 'number',
    rotationY: 'number',
    rotationZ: 'number',
    scale: 'number',
    scaleX: 'number',
    scaleY: 'number',
    scaleZ: 'number',
  },
  Mesh: MESH,
  // A Solid and Facets are meshes whose model is built from what is written: they are coloured, placed and turned as a Mesh is.
  Solid: MESH,
  Facets: MESH,
  Text: { text: 'string', textColor: 'string', opacity: 'number', ...PLACE },
};
