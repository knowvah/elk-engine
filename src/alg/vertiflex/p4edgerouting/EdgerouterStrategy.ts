// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { VertiFlexLayoutPhases } from '../VertiFlexLayoutPhases.js';
import { BendEdgeRouter } from './BendEdgeRouter.js';
import { StraightEdgeRouter } from './StraightEdgeRouter.js';

/**
 * Edge routing strategies.
 *
 * @see org.eclipse.elk.alg.vertiflex/src/org/eclipse/elk/alg/vertiflex/p4edgerouting/EdgerouterStrategy.java
 */
export class EdgerouterStrategy implements ILayoutPhaseFactory<VertiFlexLayoutPhases, ElkNode> {
  /** Straight edge routing. */
  static readonly DIRECT_ROUTING: EdgerouterStrategy = new EdgerouterStrategy('DIRECT_ROUTING', 0);
  /** Routing with bendpoints if nodes are in the way. */
  static readonly BEND_ROUTING: EdgerouterStrategy = new EdgerouterStrategy('BEND_ROUTING', 1);

  static readonly #VALUES: readonly EdgerouterStrategy[] = [
    EdgerouterStrategy.DIRECT_ROUTING,
    EdgerouterStrategy.BEND_ROUTING,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly EdgerouterStrategy[] {
    return EdgerouterStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): EdgerouterStrategy {
    const found = EdgerouterStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.vertiflex.p4edgerouting.EdgerouterStrategy.${name}`,
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

  compareTo(other: EdgerouterStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase implementation. */
  create(): ILayoutPhase<VertiFlexLayoutPhases, ElkNode> {
    switch (this) {
      case EdgerouterStrategy.DIRECT_ROUTING:
        return new StraightEdgeRouter();
      case EdgerouterStrategy.BEND_ROUTING:
        return new BendEdgeRouter();
      default:
        throw new IllegalArgumentException(`No implementation is available for the edge router ${this.toString()}`);
    }
  }
}
