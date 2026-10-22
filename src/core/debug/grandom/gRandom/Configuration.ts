// SPDX-License-Identifier: EPL-2.0
import type { DoubleQuantity } from './DoubleQuantity.js';
import type { Edges } from './Edges.js';
import { Form } from './Form.js';
import { Formats } from './Formats.js';
import type { Hierarchy } from './Hierarchy.js';
import type { Nodes } from './Nodes.js';

/**
 * The generated EMF class `Configuration`, a plain class (AD-11) whose features are plain fields with the EMF defaults.
 *
 * @see org.eclipse.elk.core.debug.grandom/src-gen/org/eclipse/elk/core/debug/grandom/gRandom/Configuration.java
 */
export class Configuration {
  #samples: number = 0;
  #form: Form = Form.TREES;
  #nodes: Nodes | null = null;
  #edges: Edges | null = null;
  #MW: boolean = false;
  #maxWidth: number | null = null;
  #MD: boolean = false;
  #maxDegree: number | null = null;
  #PF: boolean = false;
  #fraction: DoubleQuantity | null = null;
  #hierarchy: Hierarchy | null = null;
  #seed: number | null = null;
  #format: Formats = Formats.ELKT;
  #filename: string | null = null;

  getSamples(): number {
    return this.#samples;
  }

  setSamples(value: number): void {
    this.#samples = value;
  }

  getForm(): Form {
    return this.#form;
  }

  setForm(value: Form): void {
    this.#form = value;
  }

  getNodes(): Nodes | null {
    return this.#nodes;
  }

  setNodes(value: Nodes | null): void {
    this.#nodes = value;
  }

  getEdges(): Edges | null {
    return this.#edges;
  }

  setEdges(value: Edges | null): void {
    this.#edges = value;
  }

  isMW(): boolean {
    return this.#MW;
  }

  setMW(value: boolean): void {
    this.#MW = value;
  }

  getMaxWidth(): number | null {
    return this.#maxWidth;
  }

  setMaxWidth(value: number | null): void {
    this.#maxWidth = value;
  }

  isMD(): boolean {
    return this.#MD;
  }

  setMD(value: boolean): void {
    this.#MD = value;
  }

  getMaxDegree(): number | null {
    return this.#maxDegree;
  }

  setMaxDegree(value: number | null): void {
    this.#maxDegree = value;
  }

  isPF(): boolean {
    return this.#PF;
  }

  setPF(value: boolean): void {
    this.#PF = value;
  }

  getFraction(): DoubleQuantity | null {
    return this.#fraction;
  }

  setFraction(value: DoubleQuantity | null): void {
    this.#fraction = value;
  }

  getHierarchy(): Hierarchy | null {
    return this.#hierarchy;
  }

  setHierarchy(value: Hierarchy | null): void {
    this.#hierarchy = value;
  }

  getSeed(): number | null {
    return this.#seed;
  }

  setSeed(value: number | null): void {
    this.#seed = value;
  }

  getFormat(): Formats {
    return this.#format;
  }

  setFormat(value: Formats): void {
    this.#format = value;
  }

  getFilename(): string | null {
    return this.#filename;
  }

  setFilename(value: string | null): void {
    this.#filename = value;
  }
}
