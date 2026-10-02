import type { SflValue } from '../../../../sflLanguage/ast';
import { asString } from '../../../ast/valueAccess';
import type { SflIsometricData } from './types';

type Properties = Map<string, SflValue>;

export function readIsometric(properties: Properties, depth: number): SflIsometricData {
  return {
    depth,
    icon: asString(properties.get('icon')),
  };
}
