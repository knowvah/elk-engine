// SPDX-License-Identifier: EPL-2.0
import type { ElkShape } from '../../../graph/ElkShape.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { Property } from '../../../graph/properties/Property.js';
import { ElkMargin } from '../../math/ElkMargin.js';
import { ElkPadding } from '../../math/ElkPadding.js';
import { KVector } from '../../math/KVector.js';
import { CoreOptions } from '../../options/CoreOptions.js';
import type { GraphAdapters } from './GraphAdapters.js';

/**
 * Implements basic adapter functionality for `ElkGraphElement`s.
 *
 * @typeParam T the type of the underlying graph element.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/adapters/ElkGraphAdapters.java
 */
export abstract class AbstractElkGraphElementAdapter<
  T extends ElkShape,
> implements GraphAdapters.GraphElementAdapter<T> {
  /** Cached `OFFSET_PROXY` (a lazy static: `CoreOptions` is part of an ESM import cycle). */
  private static offsetProxyCache: IProperty<number> | null = null;

  /** The Java `OFFSET_PROXY`: `new Property<>(CoreOptions.PORT_BORDER_OFFSET, 0.0)`. */
  private static offsetProxy(): IProperty<number> {
    AbstractElkGraphElementAdapter.offsetProxyCache ??= Property.withDefault(CoreOptions.PORT_BORDER_OFFSET, 0.0);
    return AbstractElkGraphElementAdapter.offsetProxyCache;
  }

  /** The wrapped element (Java: protected, accessed by extending classes). */
  protected element: T;

  /**
   * Internally used versatile data field. Can be used for arbitrary information.
   * No assumptions about its value or validity should be made.
   */
  private id = 0;

  /**
   * Creates a new adapter for the given graph element.
   *
   * @param element the element to be wrapped in this adapter.
   */
  protected constructor(element: T) {
    this.element = element;
  }

  getProperty<P>(prop: IProperty<P>): P {
    // the node spacing implementation requires a default value for the offset property
    // (Java `prop.equals(...)` compares property ids)
    if (prop.getId() === CoreOptions.PORT_BORDER_OFFSET.getId()) {
      return this.element.getProperty(AbstractElkGraphElementAdapter.offsetProxy()) as unknown as P;
    }

    return this.element.getProperty(prop);
  }

  hasProperty<P>(prop: IProperty<P>): boolean {
    return this.element.hasProperty(prop);
  }

  getPosition(): KVector {
    return new KVector(this.element.getX(), this.element.getY());
  }

  getSize(): KVector {
    return new KVector(this.element.getWidth(), this.element.getHeight());
  }

  setSize(size: KVector): void {
    this.element.setWidth(size.x);
    this.element.setHeight(size.y);
  }

  setPosition(pos: KVector): void {
    this.element.setX(pos.x);
    this.element.setY(pos.y);
  }

  getPadding(): ElkPadding {
    const elkPadding = this.element.getProperty(CoreOptions.PADDING) as ElkPadding | null;
    if (elkPadding === null) {
      return new ElkPadding();
    } else {
      return new ElkPadding(elkPadding);
    }
  }

  setPadding(padding: ElkPadding): void {
    this.element.setProperty(CoreOptions.PADDING, new ElkPadding(padding));
  }

  getMargin(): ElkMargin {
    let margins = this.element.getProperty(CoreOptions.MARGINS) as ElkMargin | null;
    if (margins === null) {
      margins = new ElkMargin();
    }
    return margins;
  }

  setMargin(margin: ElkMargin): void {
    // analog to the padding case, we copy the margins object here
    const newMargin = new ElkMargin(margin);
    this.element.setProperty(CoreOptions.MARGINS, newMargin);
  }

  getVolatileId(): number {
    return this.id;
  }

  setVolatileId(volatileId: number): void {
    this.id = volatileId;
  }
}
