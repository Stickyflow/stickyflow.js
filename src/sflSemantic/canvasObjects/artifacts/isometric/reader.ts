import type { SflValue } from '../../../../sflLanguage/ast';
import { asNumber, asString } from '../../../ast/valueAccess';
import type { SflIsometricData } from './types';

type Properties = Map<string, SflValue>;

export function readIsometric(properties: Properties): SflIsometricData {
  return {
    depth: asNumber(properties.get('depth')) ?? 24,
    icon: asString(properties.get('icon')),
  };
}
