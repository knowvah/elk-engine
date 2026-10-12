// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Graph features used for automatic recognition of the suitability of layout algorithms.
 *
 * _Note:_
 * Originally, this enumeration was to be found in the `properties` package of the core plug-in. However,
 * the meta data compiler needs access to this enumeration. Making it depend on the core plug-in introduces an
 * unfortunate cyclic dependency: to compile the meta-data compiler, we need to compile the core plug-in. To
 * compile the core plug-in, we need the meta-data compiler.
 *
 * @author msp
 * @author cds
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/GraphFeature.java
 */
export class GraphFeature {
  /** Edges connecting a node with itself. */
  static readonly SELF_LOOPS: GraphFeature = new GraphFeature('SELF_LOOPS', 0, 'Edges connecting a node with itself.');
  /** Self-loops routed through a node instead of around it. */
  static readonly INSIDE_SELF_LOOPS: GraphFeature = new GraphFeature(
    'INSIDE_SELF_LOOPS',
    1,
    'Self-loops routed through a node instead of around it.',
  );
  /** Multiple edges with the same source and target node. */
  static readonly MULTI_EDGES: GraphFeature = new GraphFeature(
    'MULTI_EDGES',
    2,
    'Multiple edges with the same source and target node.',
  );
  /** Labels that are associated with edges. */
  static readonly EDGE_LABELS: GraphFeature = new GraphFeature(
    'EDGE_LABELS',
    3,
    'Labels that are associated with edges.',
  );
  /** Edges are connected to nodes over ports. */
  static readonly PORTS: GraphFeature = new GraphFeature('PORTS', 4, 'Edges are connected to nodes over ports.');
  /**
   * Edges that connect nodes from different hierarchy levels and are incident to compound nodes.
   * @see LayoutOptions#LAYOUT_HIERARCHY
   */
  static readonly COMPOUND: GraphFeature = new GraphFeature(
    'COMPOUND',
    5,
    'Edges that connect nodes from different hierarchy levels ' + 'and are incident to compound nodes.',
  );
  /** Edges that connect nodes from different clusters, but not the cluster parent nodes. */
  static readonly CLUSTERS: GraphFeature = new GraphFeature(
    'CLUSTERS',
    6,
    'Edges that connect nodes from different clusters, but not the cluster parent nodes.',
  );
  /** Multiple connected components. */
  static readonly DISCONNECTED: GraphFeature = new GraphFeature('DISCONNECTED', 7, 'Multiple connected components.');

  static readonly #VALUES: readonly GraphFeature[] = [
    GraphFeature.SELF_LOOPS,
    GraphFeature.INSIDE_SELF_LOOPS,
    GraphFeature.MULTI_EDGES,
    GraphFeature.EDGE_LABELS,
    GraphFeature.PORTS,
    GraphFeature.COMPOUND,
    GraphFeature.CLUSTERS,
    GraphFeature.DISCONNECTED,
  ];

  readonly #name: string;
  readonly #ordinal: number;
  /** The description of the graph feature. */
  readonly #description: string;

  /**
   * Creates a new graph feature with the given description. The Java no-argument constructor (empty
   * description) is the default of `description`; no constant uses it.
   *
   * @param name the constant name
   * @param ordinal the declaration index
   * @param description the description of the graph feature.
   */
  private constructor(name: string, ordinal: number, description: string = '') {
    this.#name = name;
    this.#ordinal = ordinal;
    this.#description = description;
  }

  /** The constants in declaration order. */
  static values(): readonly GraphFeature[] {
    return GraphFeature.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): GraphFeature {
    const found = GraphFeature.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.graph.properties.GraphFeature.${name}`);
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

  compareTo(other: GraphFeature): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Returns the description of the graph feature.
   *
   * @return the description
   */
  getDescription(): string {
    return this.#description;
  }
}
