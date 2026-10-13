// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../graph/ElkNode.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import type { IPropertyHolder } from '../../graph/properties/IPropertyHolder.js';
import { MapPropertyHolder } from '../../graph/properties/MapPropertyHolder.js';
import { isNullOrEmpty } from '../../guava/Strings.js';
import { ArrayIndexOutOfBoundsException } from '../../java/lang/ArrayIndexOutOfBoundsException.js';
import * as DoubleToString from '../../java/lang/DoubleToString.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import * as JavaString from '../../java/lang/JavaString.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../data/LayoutOptionData.js';
import { CoreOptions } from '../options/CoreOptions.js';
import type { GraphAdapters } from './adapters/GraphAdapters.js';
import type { IDataObject } from './IDataObject.js';

/** A (hopefully) unique separator that allows single occurrences of commas, colons, and semi-colons in-between. */
const SERIALIZED_OPTION_SEPARATOR = ';,;';
const SERIALIZED_OPTION_SEPARATOR_PATTERN = /;,;/;
const OPTION_ID_VALUE_PATTERN = /:/;
const ID_VALUE_SEPARATOR = ':';
const OPTION_ID_INDEX = 0;
const OPTION_VALUE_INDEX = 1;

/** Java's `ElkNode` versus `NodeAdapter` overload dispatch (translation-rules 6.5): only adapters have `getGraph`. */
function isNodeAdapter(node: ElkNode | GraphAdapters.NodeAdapter<unknown>): node is GraphAdapters.NodeAdapter<unknown> {
  return 'getGraph' in node && typeof node.getGraph === 'function';
}

/**
 * The text Java's `toString` gives a stored value. A TypeScript number does not say whether it is an `Integer` or
 * a `Double`; a double-typed layout option (the usual key) decides, any other number prints as a JavaScript number.
 */
function valueText(key: IProperty<unknown>, value: unknown): string {
  if (typeof value === 'number' && key instanceof LayoutOptionData && key.getType()?.name() === 'DOUBLE') {
    return DoubleToString.toString(value);
  }
  return String(value);
}

/**
 * A property holder which can be used to define individual spacing overrides. The overrides are applied to the
 * element this object is set on, which is done through the {@link CoreOptions.SPACING_INDIVIDUAL} property.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/IndividualSpacings.java
 */
export class IndividualSpacings extends MapPropertyHolder implements IDataObject {
  /**
   * Constructs an empty spacings container, or one that copies all properties of `other`. As in Java, copying a
   * non-empty container fails: `getAllProperties()` of an empty holder is `Collections.emptyMap()`, which rejects
   * `putAll` of any entry.
   *
   * @throws UnsupportedOperationException if `other` has properties
   */
  constructor(other?: IndividualSpacings) {
    super();
    if (other !== undefined && !other.getAllProperties().isEmpty()) {
      throw new UnsupportedOperationException();
    }
  }

  /**
   * Returns the value of the given property as it applies to the given node. First checks whether an individual
   * override is set on the node that has the given property configured. If so, the configured value is returned.
   * Otherwise, the node's parent node (for an `ElkNode`) or the graph the node is part of (for a `NodeAdapter`), if
   * any, is queried; for an adapter the property's default value is the last resort.
   *
   * @param node the node whose property value to return.
   * @param property the property.
   * @returns the individual override for the property or the default value inherited by the parent node.
   */
  static getIndividualOrInherited<T>(
    node: ElkNode | GraphAdapters.NodeAdapter<unknown>,
    property: IProperty<T>,
  ): T | null {
    let result: T | null = null;

    if (node.hasProperty(CoreOptions.SPACING_INDIVIDUAL)) {
      const individualSpacings: IPropertyHolder = node.getProperty(CoreOptions.SPACING_INDIVIDUAL);
      if (individualSpacings.hasProperty(property)) {
        result = individualSpacings.getProperty(property);
      }
    }

    // use the common value
    const inheritFrom = isNodeAdapter(node) ? node.getGraph() : node.getParent();
    if (result === null && inheritFrom !== null) {
      result = inheritFrom.getProperty(property);
    }

    // if the result is still null, we need the property's default value (adapters only)
    if (result === null && isNodeAdapter(node)) {
      result = property.getDefault();
    }

    return result;
  }

  toString(): string {
    return [...this.getAllProperties()]
      .map(([key, value]) => `${key.getId()}${ID_VALUE_SEPARATOR}${valueText(key, value)}`)
      .join(SERIALIZED_OPTION_SEPARATOR);
  }

  parse(string: string): void {
    if (isNullOrEmpty(string)) {
      // Nothing to do.
      return;
    }
    try {
      for (const optionString of JavaString.split(string, SERIALIZED_OPTION_SEPARATOR_PATTERN)) {
        this.parseOption(JavaString.split(optionString, OPTION_ID_VALUE_PATTERN));
      }
    } catch (e) {
      const error = new IllegalArgumentException(
        'The given string does not match the expected format for individual spacings.',
      );
      error.cause = e;
      throw error;
    }
  }

  /** Parses one `id:value` pair (already split at the colon) and sets the property. */
  private parseOption(option: readonly string[]): void {
    const id = option[OPTION_ID_INDEX];
    const valueString = option[OPTION_VALUE_INDEX];
    if (id === undefined) {
      throw new ArrayIndexOutOfBoundsException(`Index ${String(OPTION_ID_INDEX)} out of bounds for length 0`);
    }
    const optionData = LayoutMetaDataService.getInstance().getOptionDataBySuffix(id);
    if (optionData === null) {
      throw new IllegalArgumentException(`Invalid option id: ${id}`);
    }
    if (valueString === undefined) {
      throw new ArrayIndexOutOfBoundsException(
        `Index ${String(OPTION_VALUE_INDEX)} out of bounds for length ${String(option.length)}`,
      );
    }
    const value = optionData.parseValue(valueString);
    if (value === null) {
      throw new IllegalArgumentException(`Invalid option value: ${valueString}`);
    }
    this.setProperty(optionData, value);
  }
}
