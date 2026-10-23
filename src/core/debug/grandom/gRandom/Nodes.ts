// SPDX-License-Identifier: EPL-2.0
import type { DoubleQuantity } from './DoubleQuantity.js';
import type { Ports } from './Ports.js';
import type { Size } from './Size.js';

/**
 * The generated EMF class `Nodes`, a plain class (AD-11) whose features are plain fields with the EMF defaults.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/Nodes.java
 */
export class Nodes {
  #NNodes: DoubleQuantity | null = null;
  #ports: Ports | null = null;
  #labels: boolean = false;
  #size: Size | null = null;
  #removeIsolated: boolean = false;

  getNNodes(): DoubleQuantity | null {
    return this.#NNodes;
  }

  setNNodes(value: DoubleQuantity | null): void {
    this.#NNodes = value;
  }

  getPorts(): Ports | null {
    return this.#ports;
  }

  setPorts(value: Ports | null): void {
    this.#ports = value;
  }

  isLabels(): boolean {
    return this.#labels;
  }

  setLabels(value: boolean): void {
    this.#labels = value;
  }

  getSize(): Size | null {
    return this.#size;
  }

  setSize(value: Size | null): void {
    this.#size = value;
  }

  isRemoveIsolated(): boolean {
    return this.#removeIsolated;
  }

  setRemoveIsolated(value: boolean): void {
    this.#removeIsolated = value;
  }
}
