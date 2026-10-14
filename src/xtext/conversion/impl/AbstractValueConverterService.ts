// SPDX-License-Identifier: EPL-2.0
import type { INode } from '../../nodemodel/INode.js';
import type { IValueConverterService } from '../IValueConverterService.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/AbstractValueConverterService.java */
export abstract class AbstractValueConverterService implements IValueConverterService {
  abstract toValue(string: string | null, lexerRule: string, node: INode | null): unknown;

  abstract toString(value: unknown, lexerRule: string): string;
}
