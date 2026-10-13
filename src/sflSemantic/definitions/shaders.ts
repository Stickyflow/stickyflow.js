import type { Shader, ShaderParameter } from '../../model/shader';
import type { SflBlock } from '../../sflLanguage/ast';
import { directProperties } from '../ast/blockEntries';
import { asNumber, asString } from '../ast/valueAccess';

export function readShaderDefinition(block: SflBlock): Shader | undefined {
  const properties = directProperties(block);
  const program = asString(properties.get('program'));
  if (!program) {
    return undefined;
  }

  const parameters: Record<string, ShaderParameter> = {};
  for (const [key, value] of properties) {
    if (key === 'program') {
      continue;
    }
    const number = asNumber(value);
    const text = asString(value);
    if (number !== undefined) {
      parameters[key] = number;
    } else if (text !== undefined) {
      parameters[key] = text === 'true' ? true : text === 'false' ? false : text;
    }
  }
  return { name: block.name, program, parameters };
}
