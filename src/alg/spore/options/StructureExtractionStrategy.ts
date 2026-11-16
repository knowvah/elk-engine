// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { Graph } from '../graph/Graph.js';
import { DelaunayTriangulationPhase } from '../p1structure/DelaunayTriangulationPhase.js';
import type { SPOrEPhases } from '../SPOrEPhases.js';

/**
 * Definition of the structure extraction strategy for SPOrE.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/options/StructureExtractionStrategy.java
 */
export class StructureExtractionStrategy implements ILayoutPhaseFactory<SPOrEPhases, Graph> {
  /** A Delaunay triangulation. */
  static readonly DELAUNAY_TRIANGULATION: StructureExtractionStrategy = new StructureExtractionStrategy(
    'DELAUNAY_TRIANGULATION',
    0,
  );

  static readonly #VALUES: readonly StructureExtractionStrategy[] = [
    StructureExtractionStrategy.DELAUNAY_TRIANGULATION,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly StructureExtractionStrategy[] {
    return StructureExtractionStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): StructureExtractionStrategy {
    const found = StructureExtractionStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.spore.options.StructureExtractionStrategy.${name}`,
      );
    }
    return found;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  name(): string {
    return this.#name;
  }

  toString(): string {
    return this.#name;
  }

  compareTo(other: StructureExtractionStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase this strategy stands for. */
  create(): ILayoutPhase<SPOrEPhases, Graph> {
    switch (this) {
      case StructureExtractionStrategy.DELAUNAY_TRIANGULATION:
        return new DelaunayTriangulationPhase();
      default:
        throw new IllegalArgumentException(`No implementation available for ${this.toString()}`);
    }
  }
}
