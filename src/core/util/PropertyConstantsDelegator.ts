// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../graph/properties/IProperty.js';
import type { IPropertyHolder } from '../../graph/properties/IPropertyHolder.js';
import { PROPERTY } from '../../graph/properties/MapPropertyHolder.js';
import { Property } from '../../graph/properties/Property.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { JavaHashMap } from '../../java/util/JavaHashMap.js';
import type { LayoutAlgorithmData } from '../data/LayoutAlgorithmData.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import type { GraphAdapters } from './adapters/GraphAdapters.js';
import { IndividualSpacings } from './IndividualSpacings.js';

/**
 * Allows to reroute access to properties through other property constants which may provide different default values.
 * This class is a workaround for the fact that algorithm-independent layout code only has `CoreOptions` property
 * constants to work with, along with the defaults configured therein. An algorithm can change the default value, which
 * is reflected in the algorithm's set of property constants, which (and this is the big problem) the independent code
 * doesn't know about. Instances of this class can be supplied by layout algorithms to independent code to replace its
 * `CoreOptions` property constants with the algorithm-specific constants.
 *
 * This class can be used in one of two ways:
 * 1. Manual configuration. Call {@link createEmpty} to create an instance without property delegates and add
 *    delegates manually by calling {@link addDelegate}.
 * 2. Automatic configuration. Call {@link createForLayoutAlgorithmWithId} to create an instance initialized with the
 *    property constants defined for the algorithm with the given ID. Requires the layout meta data service to be
 *    properly initialized.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/PropertyConstantsDelegator.java
 */
export class PropertyConstantsDelegator {
  /**
   * Set of property constants to be used for accessing their respective property. A `JavaHashMap` with the
   * id-based `PROPERTY` strategy: `Property.equals`/`hashCode` compare by id, so a different `Property` object with
   * the same id must hit. Only looked up, never iterated.
   */
  private readonly propertyDelegates: JavaHashMap<IProperty<unknown>, IProperty<unknown>> = new JavaHashMap<
    IProperty<unknown>,
    IProperty<unknown>
  >(PROPERTY);

  /** Private constructor. Use create methods instead. */
  private constructor() {}

  /** Creates and returns an empty {@link PropertyConstantsDelegator} to be configured manually. */
  static createEmpty(): PropertyConstantsDelegator {
    return new PropertyConstantsDelegator();
  }

  /**
   * Creates a new {@link PropertyConstantsDelegator} and initializes it with the layout options known to the given
   * algorithm.
   *
   * @param algorithmData algorithm data to initialize the delegator with.
   * @returns initialized delegator.
   */
  static createForLayoutAlgorithmData(algorithmData: LayoutAlgorithmData): PropertyConstantsDelegator {
    const delegator = new PropertyConstantsDelegator();

    // Delegate to property constants for all known options
    for (const optionId of algorithmData.getKnownOptionIds()) {
      delegator.addDelegate(new Property<unknown>(optionId, algorithmData.getDefaultValue(optionId)));
    }

    return delegator;
  }

  /**
   * Creates a new {@link PropertyConstantsDelegator} and initializes it with the layout options known to the
   * algorithm with the given ID. If an algorithm with the ID is not registered with the `LayoutMetaDataService`, an
   * empty delegator is returned.
   *
   * @param algorithmId identifier of the layout algorithm to initialize the delegator with.
   * @returns initialized delegator.
   */
  static createForLayoutAlgorithmWithId(algorithmId: string): PropertyConstantsDelegator {
    const algorithmData = LayoutMetaDataService.getInstance().getAlgorithmData(algorithmId);
    return algorithmData !== null
      ? PropertyConstantsDelegator.createForLayoutAlgorithmData(algorithmData)
      : PropertyConstantsDelegator.createEmpty();
  }

  /**
   * Configures the given property constant to be used to access its property.
   *
   * @param delegate the property constant to be used.
   * @returns this object for method chaining.
   */
  addDelegate(delegate: IProperty<unknown>): this {
    this.propertyDelegates.put(delegate, delegate);
    return this;
  }

  /**
   * Returns the delegate configured for the given property or the property itself, if there is no delegate.
   *
   * @param property the property for which to look for a delegate.
   * @returns the delegate or the property itself, if there is no delegate.
   */
  getPropertyOrDelegate<T>(property: IProperty<T>): IProperty<T> {
    // The following cast should be safe since constants whose property IDs match should have a matching
    // type as well
    return this.propertyDelegates.containsKey(property)
      ? (this.propertyDelegates.get(property) as IProperty<T>)
      : property;
  }

  /**
   * Calls `getProperty` on the given property holder or graph element adapter either using the given property
   * constant or a delegate, if one is configured (Java overloads `getProperty(IPropertyHolder, IProperty)` and
   * `getProperty(GraphElementAdapter, IProperty)` have the same body).
   *
   * @param propertyHolder the property holder or adapter to call `getProperty` on.
   * @param property the property to access.
   * @returns the property value.
   */
  getProperty<T>(
    propertyHolder: IPropertyHolder | GraphAdapters.GraphElementAdapter<unknown>,
    property: IProperty<T>,
  ): T {
    return propertyHolder.getProperty(this.getPropertyOrDelegate(property));
  }

  /**
   * Calls `IndividualSpacings.getIndividualOrInherited` on the given node or node adapter either using the given
   * property constants or a delegate, if one is configured (both Java overloads).
   *
   * @param node the node or node adapter to retrieve the property value from.
   * @param property the property to access.
   * @returns the property value.
   */
  getIndividualOrInheritedProperty<T>(
    node: ElkNode | GraphAdapters.NodeAdapter<unknown>,
    property: IProperty<T>,
  ): T | null {
    return IndividualSpacings.getIndividualOrInherited(node, this.getPropertyOrDelegate(property));
  }
}
