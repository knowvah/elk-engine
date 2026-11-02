// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import { InteractiveNodePlacer } from '../p4nodes/InteractiveNodePlacer.js';
import { LinearSegmentsNodePlacer } from '../p4nodes/LinearSegmentsNodePlacer.js';
import { NetworkSimplexPlacer } from '../p4nodes/NetworkSimplexPlacer.js';
import { SimpleNodePlacer } from '../p4nodes/SimpleNodePlacer.js';
import { BKNodePlacer } from '../p4nodes/bk/BKNodePlacer.js';

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
   * Creates the phase implementation.
   */
  create(): ILayoutPhase<LayeredPhases, LGraph> {
    switch (this) {
      case NodePlacementStrategy.SIMPLE:
        return new SimpleNodePlacer();
      case NodePlacementStrategy.INTERACTIVE:
        return new InteractiveNodePlacer();
      case NodePlacementStrategy.LINEAR_SEGMENTS:
        return new LinearSegmentsNodePlacer();
      case NodePlacementStrategy.BRANDES_KOEPF:
        return new BKNodePlacer();
      case NodePlacementStrategy.NETWORK_SIMPLEX:
        return new NetworkSimplexPlacer();
      default:
        throw new IllegalArgumentException(`No implementation is available for the node placer ${this.toString()}`);
    }
  }
}
