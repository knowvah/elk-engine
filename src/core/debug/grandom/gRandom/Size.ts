// SPDX-License-Identifier: EPL-2.0
import type { DoubleQuantity } from './DoubleQuantity.js';

/**
 * The generated EMF class `Size`, a plain class (AD-11) whose features are plain fields with the EMF defaults.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/Size.java
 */
export class Size {
  #height: DoubleQuantity | null = null;
  #width: DoubleQuantity | null = null;

  getHeight(): DoubleQuantity | null {
    return this.#height;
  }

  setHeight(value: DoubleQuantity | null): void {
    this.#height = value;
  }

  getWidth(): DoubleQuantity | null {
    return this.#width;
  }

  setWidth(value: DoubleQuantity | null): void {
    this.#width = value;
  }
}
