// SPDX-License-Identifier: EPL-2.0

/**
 * Definition of balancing modes. Java's private nested enum `LinearSegmentsNodePlacer.Mode` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/LinearSegmentsNodePlacer.java:571
 */
export class LinearSegmentsNodePlacerMode {
  static readonly FORW_PENDULUM: LinearSegmentsNodePlacerMode = new LinearSegmentsNodePlacerMode('FORW_PENDULUM', 0);
  static readonly BACKW_PENDULUM: LinearSegmentsNodePlacerMode = new LinearSegmentsNodePlacerMode('BACKW_PENDULUM', 1);
  static readonly RUBBER: LinearSegmentsNodePlacerMode = new LinearSegmentsNodePlacerMode('RUBBER', 2);

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  name(): string {
    return this.#name;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  toString(): string {
    return this.#name;
  }
}
