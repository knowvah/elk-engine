// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import type { IQualifiedNameConverter } from '../../../../xtext/naming/IQualifiedNameConverter.js';
import { QualifiedName } from '../../../../xtext/naming/QualifiedName.js';
import type { IEObjectDescription } from '../../../../xtext/resource/IEObjectDescription.js';
import type { IScope } from '../../../../xtext/scoping/IScope.js';
import { ElkGraphUtil } from '../../../util/ElkGraphUtil.js';
import { ELK_EDGE__TARGETS } from '../linking/ElkGraphJsonReferences.js';
import { ElkGraphJsonCrossReferenceSerializer } from './ElkGraphJsonCrossReferenceSerializer.js';
import { ElkGraphJsonSerializationError } from './ElkGraphJsonSerializationError.js';

const names: IQualifiedNameConverter = {
  toString: (name) => name.toString('.'),
  toQualifiedName: (text) => QualifiedName.create(text),
};

function description(name: string): IEObjectDescription {
  return { getName: () => QualifiedName.create(name) } as unknown as IEObjectDescription;
}

function serializer(
  offered: readonly string[],
  convert: (text: string) => string,
): ElkGraphJsonCrossReferenceSerializer {
  const scope: IScope = {
    getSingleElement: () => null,
    getElements: () => offered.map(description),
    getAllElements: () => [],
  };
  return new ElkGraphJsonCrossReferenceSerializer({ getScope: () => scope }, names, {
    toString: (value: unknown) => convert(value as string),
    toValue: () => null,
  });
}

const edge = ElkGraphUtil.createEdge(null);
const target: EObject = ElkGraphUtil.createNode(null);
const reject = (text: string): string => {
  if (text === 'bad') throw new ValueConverterException('invalid', null, null);
  return `<${text}>`;
};

describe('ElkGraphJsonCrossReferenceSerializer', () => {
  it('writes the first name of the scope that converts', () => {
    expect(serializer(['bad', 'ok'], reject).serializeCrossRef(edge, ELK_EDGE__TARGETS, 'STRING', target)).toBe('<ok>');
  });

  it('fails when every name fails to convert, with the first conversion failure as the cause', () => {
    const attempt = (): string =>
      serializer(['bad'], reject).serializeCrossRef(edge, ELK_EDGE__TARGETS, 'STRING', target);
    expect(attempt).toThrow(/no valid STRING/);
    try {
      attempt();
    } catch (e) {
      expect((e as Error).cause).toBeInstanceOf(ValueConverterException);
    }
  });

  it('fails when the scope has no name for the target', () => {
    expect(() => serializer([], reject).serializeCrossRef(edge, ELK_EDGE__TARGETS, 'STRING', target)).toThrow(
      new ElkGraphJsonSerializationError(
        "Cannot write the reference 'targets': its target is not visible in the scope of the reference.",
      ),
    );
  });

  it('propagates a failure that is no value conversion error', () => {
    const boom = (): string => {
      throw new RangeError('boom');
    };
    expect(() => serializer(['a'], boom).serializeCrossRef(edge, ELK_EDGE__TARGETS, 'STRING', target)).toThrow(
      RangeError,
    );
  });
});
