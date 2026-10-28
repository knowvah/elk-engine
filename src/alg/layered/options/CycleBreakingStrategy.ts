// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';

/**
 * Enumeration of and factory for the different available cycle breaking strategies. The model order cycle breakers
 * additionally allow a group model order to be set and enforced.
 *
 * @author msp
 * @author cds
 *
 * `@AdvancedPropertyValue`: `INTERACTIVE`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/CycleBreakingStrategy.java
 */
export class CycleBreakingStrategy implements ILayoutPhaseFactory<LayeredPhases, LGraph> {
  /** Applies a greedy heuristic to minimize the number of reversed edges. */
  static readonly GREEDY: CycleBreakingStrategy = new CycleBreakingStrategy('GREEDY', 0);
  /** Applies a depth-first traversal to find and reverse edges to make the graph acyclic. This uses the edge
   * order as the iteration order. */
  static readonly DEPTH_FIRST: CycleBreakingStrategy = new CycleBreakingStrategy('DEPTH_FIRST', 1);
  /** Reacts on user interaction by respecting initial node positions. The actual positions as given in the input
   * diagram are considered here. This means that if the user moves a node, that movement is reflected in the decision
   * which edges to reverse. */
  static readonly INTERACTIVE: CycleBreakingStrategy = new CycleBreakingStrategy('INTERACTIVE', 2);
  /** Reacts to the input model by respecting the initial ordering in the model file. This ordering is used to
   * identify backwards edges. Optionally, this uses the group model order instead of the model order as primary
   * criterion. */
  static readonly MODEL_ORDER: CycleBreakingStrategy = new CycleBreakingStrategy('MODEL_ORDER', 3);
  /** Applies a greedy heuristic to minimize the number of reversed edges but uses the model order as a
   * tie-breaker. Optionally, this uses the group model order instead of the model order as a tie-breaker. */
  static readonly GREEDY_MODEL_ORDER: CycleBreakingStrategy = new CycleBreakingStrategy('GREEDY_MODEL_ORDER', 4);
  /** Uses Tarjan's algorithm to calculate the strongly connected components. Then it determines the order
   * in these components, i.e. the cycles using the in-/out-degree of the nodes. E.g. first Tarjan, then greedy, then
   * model order. Optionally, this uses the group model order instead of the model order as primary criterion. */
  static readonly SCC_CONNECTIVITY: CycleBreakingStrategy = new CycleBreakingStrategy('SCC_CONNECTIVITY', 5);
  /** Uses the strongly connected component approach and selects the minima/maxima based on the model order.
   * Moreover, this allows us to prefer certain model order groups as source and target. I.e., first Tarjan, model order,
   * then preferred types, then greedy. Optionally, this uses the group model order instead of the model order as
   * primary criterion. */
  static readonly SCC_NODE_TYPE: CycleBreakingStrategy = new CycleBreakingStrategy('SCC_NODE_TYPE', 6);
  /** Applies a depth-first traversal to find and reverse edges to make the graph acyclic. This uses the node
   * model order as the iteration order. Optionally, this uses the group model order instead of the model order as
   * iteration order. */
  static readonly DFS_NODE_ORDER: CycleBreakingStrategy = new CycleBreakingStrategy('DFS_NODE_ORDER', 7);
  /** Applies a breadth-first traversal to find and reverse edges to make the graph acyclic. This uses the node
   * model order as the iteration order. Optionally, this uses the group model order instead of the model order as
   * iteration order. */
  static readonly BFS_NODE_ORDER: CycleBreakingStrategy = new CycleBreakingStrategy('BFS_NODE_ORDER', 8);

  static readonly #VALUES: readonly CycleBreakingStrategy[] = [
    CycleBreakingStrategy.GREEDY,
    CycleBreakingStrategy.DEPTH_FIRST,
    CycleBreakingStrategy.INTERACTIVE,
    CycleBreakingStrategy.MODEL_ORDER,
    CycleBreakingStrategy.GREEDY_MODEL_ORDER,
    CycleBreakingStrategy.SCC_CONNECTIVITY,
    CycleBreakingStrategy.SCC_NODE_TYPE,
    CycleBreakingStrategy.DFS_NODE_ORDER,
    CycleBreakingStrategy.BFS_NODE_ORDER,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly CycleBreakingStrategy[] {
    return CycleBreakingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): CycleBreakingStrategy {
    const found = CycleBreakingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.CycleBreakingStrategy.${name}`,
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

  compareTo(other: CycleBreakingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Creates the phase implementation. Every arm's class is ported in a later mission (L1): until then the arm throws
   * `UnsupportedOperationException` naming the class and the mission, with no import.
   */
  create(): ILayoutPhase<LayeredPhases, LGraph> {
    switch (this) {
      case CycleBreakingStrategy.GREEDY:
        throw notPorted('GreedyCycleBreaker', '7b');
      case CycleBreakingStrategy.DEPTH_FIRST:
        throw notPorted('DepthFirstCycleBreaker', '7b');
      case CycleBreakingStrategy.INTERACTIVE:
        throw notPorted('InteractiveCycleBreaker', '7b');
      case CycleBreakingStrategy.MODEL_ORDER:
        throw notPorted('ModelOrderCycleBreaker', '7b');
      case CycleBreakingStrategy.GREEDY_MODEL_ORDER:
        throw notPorted('GreedyModelOrderCycleBreaker', '7b');
      case CycleBreakingStrategy.SCC_CONNECTIVITY:
        throw notPorted('SCConnectivity', '7b');
      case CycleBreakingStrategy.SCC_NODE_TYPE:
        throw notPorted('SCCNodeTypeCycleBreaker', '7b');
      case CycleBreakingStrategy.DFS_NODE_ORDER:
        throw notPorted('DFSNodeOrderCycleBreaker', '7b');
      case CycleBreakingStrategy.BFS_NODE_ORDER:
        throw notPorted('BFSNodeOrderCycleBreaker', '7b');
      default:
        throw new IllegalArgumentException(`No implementation is available for the cycle breaker ${this.toString()}`);
    }
  }
}

/** The L1 placeholder for a `create()` arm whose class is not ported yet. */
function notPorted(className: string, mission: string): UnsupportedOperationException {
  return new UnsupportedOperationException(`${className} is ported in mission ${mission}`);
}
