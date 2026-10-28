// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';

/**
 * Definition of the available node placement strategies for the layered layout approach.
 *
 * `@AdvancedPropertyValue`: `INTERACTIVE`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/NodePlacementStrategy.java
 */
export class NodePlacementStrategy implements ILayoutPhaseFactory<LayeredPhases, LGraph> {
  /** Very simple and very fast node placement that centers all nodes vertically. */
  static readonly SIMPLE: NodePlacementStrategy = new NodePlacementStrategy('SIMPLE', 0);
  /** Interactive node placer that leaves y coordinates of nodes untouched. */
  static readonly INTERACTIVE: NodePlacementStrategy = new NodePlacementStrategy('INTERACTIVE', 1);
  /** Node placement algorithm that aligns long edges using linear segments. Nodes are aligned according to the
   * _pendulum_ method, which is similar to the barycenter method for node ordering. */
  static readonly LINEAR_SEGMENTS: NodePlacementStrategy = new NodePlacementStrategy('LINEAR_SEGMENTS', 2);
  /** Node placement which groups nodes to blocks which result in straight edges. */
  static readonly BRANDES_KOEPF: NodePlacementStrategy = new NodePlacementStrategy('BRANDES_KOEPF', 3);
  /** Using an auxiliary graph and the `NetworkSimplex` algorithm to calculate a balanced placement with
   * straight long edges. */
  static readonly NETWORK_SIMPLEX: NodePlacementStrategy = new NodePlacementStrategy('NETWORK_SIMPLEX', 4);

  static readonly #VALUES: readonly NodePlacementStrategy[] = [
    NodePlacementStrategy.SIMPLE,
    NodePlacementStrategy.INTERACTIVE,
    NodePlacementStrategy.LINEAR_SEGMENTS,
    NodePlacementStrategy.BRANDES_KOEPF,
    NodePlacementStrategy.NETWORK_SIMPLEX,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly NodePlacementStrategy[] {
    return NodePlacementStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): NodePlacementStrategy {
    const found = NodePlacementStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.NodePlacementStrategy.${name}`,
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

  compareTo(other: NodePlacementStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Creates the phase implementation. Every arm's class is ported in a later mission (L1): until then the arm throws
   * `UnsupportedOperationException` naming the class and the mission, with no import.
   */
  create(): ILayoutPhase<LayeredPhases, LGraph> {
    switch (this) {
      case NodePlacementStrategy.SIMPLE:
        throw notPorted('SimpleNodePlacer', '7d');
      case NodePlacementStrategy.INTERACTIVE:
        throw notPorted('InteractiveNodePlacer', '7d');
      case NodePlacementStrategy.LINEAR_SEGMENTS:
        throw notPorted('LinearSegmentsNodePlacer', '7d');
      case NodePlacementStrategy.BRANDES_KOEPF:
        throw notPorted('BKNodePlacer', '7d');
      case NodePlacementStrategy.NETWORK_SIMPLEX:
        throw notPorted('NetworkSimplexPlacer', '7d');
      default:
        throw new IllegalArgumentException(`No implementation is available for the node placer ${this.toString()}`);
    }
  }
}

/** The L1 placeholder for a `create()` arm whose class is not ported yet. */
function notPorted(className: string, mission: string): UnsupportedOperationException {
  return new UnsupportedOperationException(`${className} is ported in mission ${mission}`);
}
