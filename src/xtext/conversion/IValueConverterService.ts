// SPDX-License-Identifier: EPL-2.0
import type { INode } from '../nodemodel/INode.js';
import type { IValueConverter } from './IValueConverter.js';

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/IValueConverterService.java
 */
export interface IValueConverterService {
  /** @throws ValueConverterException */
  toValue(string: string | null, lexerRule: string, node: INode | null): unknown;

  toString(value: unknown, lexerRule: string): string;
}

/**
 * Extension interface to the value converter service. Clients that need to access the very same value
 * converter very often may obtain it and cache it locally.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/IValueConverterService.java:32-34
 */
export interface Introspectable {
  getConverter(lexerRule: string): IValueConverter<unknown>;
}
