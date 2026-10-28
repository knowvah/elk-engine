// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../../graph/properties/IProperty.js';
import type { KVector } from '../../../core/math/KVector.js';
import type { GraphAdapters } from '../../../core/util/adapters/GraphAdapters.js';
import type { LShape } from './LShape.js';

/**
 * Basic base class for adapters that adapt {@link LShape}s.
 *
 * @typeParam T type of the adapted element.
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphAdapters.java
 */
export abstract class AbstractLShapeAdapter<T extends LShape> implements GraphAdapters.GraphElementAdapter<T> {
  /** The wrapped element. */
  protected element: T;

  /**
   * Creates a new adapter for the given element.
   *
   * @param element the element to be adapted.
   */
  constructor(element: T) {
    this.element = element;
  }

  getSize(): KVector {
    return this.element.getSize();
  }

  setSize(size: KVector): void {
    this.element.getSize().x = size.x;
    this.element.getSize().y = size.y;
  }

  getPosition(): KVector {
    return this.element.getPosition();
  }

  setPosition(pos: KVector): void {
    this.element.getPosition().x = pos.x;
    this.element.getPosition().y = pos.y;
  }

  getProperty<P>(prop: IProperty<P>): P {
    return this.element.getProperty(prop);
  }

  hasProperty<P>(prop: IProperty<P>): boolean {
    return this.element.hasProperty(prop);
  }

  getVolatileId(): number {
    return this.element.id;
  }

  setVolatileId(volatileId: number): void {
    this.element.id = volatileId;
  }
}
