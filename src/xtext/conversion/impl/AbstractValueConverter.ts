// SPDX-License-Identifier: EPL-2.0
import type { INode } from '../../nodemodel/INode.js';
import type { IValueConverter } from '../IValueConverter.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/AbstractValueConverter.java */
export abstract class AbstractValueConverter<T> implements IValueConverter<T> {
  abstract toValue(string: string | null, node: INode | null): T | null;

  abstract toString(value: T | null): string;
}
