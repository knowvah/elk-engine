// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';
import { NodeYPlacer } from './NodeYPlacer.js';

/**
 * Vertical node placement strategies.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p1yplacement/NodeYPlacerStrategy.java
 */
export class NodeYPlacerStrategy implements ILayoutPhaseFactory<VertiFlexLayoutPhases, ElkNode> {
  /**
   * Simple strategy for setting y coordinates of nodes. Vertical constraints are considered and if none are defined
   * the fallback is to compute a position based on the node's location in the tree.
   */
  static readonly SIMPLE_Y_PLACING: NodeYPlacerStrategy = new NodeYPlacerStrategy('SIMPLE_Y_PLACING', 0);

  static readonly #VALUES: readonly NodeYPlacerStrategy[] = [NodeYPlacerStrategy.SIMPLE_Y_PLACING];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly NodeYPlacerStrategy[] {
    return NodeYPlacerStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): NodeYPlacerStrategy {
    const found = NodeYPlacerStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.vertiflex.p1yplacement.NodeYPlacerStrategy.${name}`,
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

  compareTo(other: NodeYPlacerStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase implementation. */
  create(): ILayoutPhase<VertiFlexLayoutPhases, ElkNode> {
    switch (this) {
      case NodeYPlacerStrategy.SIMPLE_Y_PLACING:
        return new NodeYPlacer();
      default:
        throw new IllegalArgumentException(`No implementation is available for the node placer ${this.toString()}`);
    }
  }
}
