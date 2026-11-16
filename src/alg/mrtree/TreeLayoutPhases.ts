// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import type { TGraph } from './graph/TGraph.js';
import { DFSTreeifyer } from './p1treeify/DFSTreeifyer.js';
import { NodeOrderer } from './p2order/NodeOrderer.js';
import { NodePlacer } from './p3place/NodePlacer.js';
import { EdgeRouter } from './p4route/EdgeRouter.js';

/**
 * This algorithm's layout phases. Since none of the phases have alternative implementations, this enumeration also
 * serves as a layout phase factory (this is not quite true for the node ordering phase, but there was never a way to
 * switch between the two implementations; if there is one some day, each phase will have to get its own factory).
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/TreeLayoutPhases.java
 */
export class TreeLayoutPhases implements ILayoutPhaseFactory<TreeLayoutPhases, TGraph> {
  /** Phase 1. */
  static readonly P1_TREEIFICATION: TreeLayoutPhases = new TreeLayoutPhases('P1_TREEIFICATION', 0);
  /** Phase 2. */
  static readonly P2_NODE_ORDERING: TreeLayoutPhases = new TreeLayoutPhases('P2_NODE_ORDERING', 1);
  /** Phase 3. */
  static readonly P3_NODE_PLACEMENT: TreeLayoutPhases = new TreeLayoutPhases('P3_NODE_PLACEMENT', 2);
  /** Phase 4. */
  static readonly P4_EDGE_ROUTING: TreeLayoutPhases = new TreeLayoutPhases('P4_EDGE_ROUTING', 3);

  static readonly #VALUES: readonly TreeLayoutPhases[] = [
    TreeLayoutPhases.P1_TREEIFICATION,
    TreeLayoutPhases.P2_NODE_ORDERING,
    TreeLayoutPhases.P3_NODE_PLACEMENT,
    TreeLayoutPhases.P4_EDGE_ROUTING,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly TreeLayoutPhases[] {
    return TreeLayoutPhases.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): TreeLayoutPhases {
    const found = TreeLayoutPhases.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.mrtree.TreeLayoutPhases.${name}`);
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

  compareTo(other: TreeLayoutPhases): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase implementation. */
  create(): ILayoutPhase<TreeLayoutPhases, TGraph> {
    switch (this) {
      case TreeLayoutPhases.P1_TREEIFICATION:
        return new DFSTreeifyer();
      case TreeLayoutPhases.P2_NODE_ORDERING:
        return new NodeOrderer();
      case TreeLayoutPhases.P3_NODE_PLACEMENT:
        return new NodePlacer();
      case TreeLayoutPhases.P4_EDGE_ROUTING:
        return new EdgeRouter();
      default:
        throw new IllegalArgumentException(`No implementation is available for the layout phase ${this.toString()}`);
    }
  }
}
