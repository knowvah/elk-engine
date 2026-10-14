// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EObject } from '../../../emf/ecore/EObject.js';
import { ValueConverterException } from '../../../xtext/conversion/ValueConverterException.js';
import { QualifiedName } from '../../../xtext/naming/QualifiedName.js';
import type { IQualifiedNameConverter } from '../../../xtext/naming/IQualifiedNameConverter.js';
import type { IEObjectDescription } from '../../../xtext/resource/IEObjectDescription.js';
import type { IScope } from '../../../xtext/scoping/IScope.js';
import { ElkGraphUtil } from '../../util/ElkGraphUtil.js';
import { ELK_EDGE__TARGETS } from '../linking/ElkGraphReferences.js';
import { CrossReferenceSerializer } from './CrossReferenceSerializer.js';
import { ElkGraphSerializationError } from './ElkGraphSerializationError.js';

const names: IQualifiedNameConverter = {
  toString: (name) => name.toString('.'),
  toQualifiedName: (text) => QualifiedName.create(text),
};

function description(name: string): IEObjectDescription {
  return { getName: () => QualifiedName.create(name) } as unknown as IEObjectDescription;
}

function serializer(offered: readonly string[], convert: (text: string) => string): CrossReferenceSerializer {
  const scope: IScope = {
    getSingleElement: () => null,
    getElements: () => offered.map(description),
    getAllElements: () => [],
  };
  return new CrossReferenceSerializer({ getScope: () => scope }, names, {
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

describe('CrossReferenceSerializer', () => {
  it('writes the first name of the scope that converts', () => {
    expect(serializer(['bad', 'ok'], reject).serializeCrossRef(edge, ELK_EDGE__TARGETS, 'QualifiedId', target)).toBe(
      '<ok>',
    );
  });

  it('fails when every name fails to convert', () => {
    expect(() => serializer(['bad'], reject).serializeCrossRef(edge, ELK_EDGE__TARGETS, 'ID', target)).toThrow(
      /no valid identifier/,
    );
  });

  it('fails when the scope has no name for the target', () => {
    expect(() => serializer([], reject).serializeCrossRef(edge, ELK_EDGE__TARGETS, 'ID', target)).toThrow(
      ElkGraphSerializationError,
    );
  });

  it('propagates a failure that is no value conversion error', () => {
    const boom = (): string => {
      throw new RangeError('boom');
    };
    expect(() => serializer(['a'], boom).serializeCrossRef(edge, ELK_EDGE__TARGETS, 'ID', target)).toThrow(RangeError);
  });
});
