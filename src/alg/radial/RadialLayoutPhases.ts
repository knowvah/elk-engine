// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../core/alg/ILayoutPhaseFactory.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EadesRadial } from './p1position/EadesRadial.js';
import { StraightLineEdgeRouter } from './p2routing/StraightLineEdgeRouter.js';

/**
 * The phases of the radial layout provider.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/RadialLayoutPhases.java
 */
export class RadialLayoutPhases implements ILayoutPhaseFactory<RadialLayoutPhases, ElkNode> {
  /** Place the nodes. */
  static readonly P1_NODE_PLACEMENT: RadialLayoutPhases = new RadialLayoutPhases('P1_NODE_PLACEMENT', 0);
  /** Route the edges of the graph. */
  static readonly P2_EDGE_ROUTING: RadialLayoutPhases = new RadialLayoutPhases('P2_EDGE_ROUTING', 1);

  static readonly #VALUES: readonly RadialLayoutPhases[] = [
    RadialLayoutPhases.P1_NODE_PLACEMENT,
    RadialLayoutPhases.P2_EDGE_ROUTING,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly RadialLayoutPhases[] {
    return RadialLayoutPhases.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): RadialLayoutPhases {
    const found = RadialLayoutPhases.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.radial.RadialLayoutPhases.${name}`);
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

  compareTo(other: RadialLayoutPhases): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase implementation. */
  create(): ILayoutPhase<RadialLayoutPhases, ElkNode> {
    switch (this) {
      case RadialLayoutPhases.P1_NODE_PLACEMENT:
        return new EadesRadial();
      case RadialLayoutPhases.P2_EDGE_ROUTING:
        return new StraightLineEdgeRouter();
      default:
        throw new IllegalArgumentException(
          `No implementation is available for the layout processor ${this.toString()}`,
        );
    }
  }
}
