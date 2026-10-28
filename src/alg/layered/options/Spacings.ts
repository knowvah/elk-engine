// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../../graph/properties/IProperty.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LGraphElement } from '../graph/LGraphElement.js';
import { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LayeredOptions } from './LayeredOptions.js';
import { UnspecifiedSpacingException } from './SpacingsUnspecifiedSpacingException.js';

/** The four Java parameter lists of `Spacings.nodeTypeSpacing`. */
type NodeTypeSpacingArgs =
  | [NodeType, IProperty<number>]
  | [NodeType, IProperty<number>, IProperty<number>]
  | [NodeType, NodeType, IProperty<number>]
  | [NodeType, NodeType, IProperty<number>, IProperty<number>];

/** A `NodeType × NodeType` table of spacing options; unset pairs are `null`, as in the Java array. */
type SpacingTable = (IProperty<number> | null)[][];

/**
 * FIXME
 *
 * Container class for a variety of spacing values that are either specified in the general {@link LayeredOptions}
 * class or ELK Layered's dedicated {@link LayeredOptions} class. This class allows to either select the recorded
 * spacing values directly or to query for spacing values using one of the convenience methods. The methods do not
 * provide results for every combination of graph elements yet. In case it does not know the answer a
 * {@link UnspecifiedSpacingException} is thrown. In such a case the developer should add the required functionality
 * to this class.
 *
 * Java overloads `nodeTypeSpacing` (four forms), `getHorizontalSpacing` (three), `getVerticalSpacing` and
 * `getLocalSpacing` (two each); each is one implementation dispatching on arity and `instanceof` (translation-rules
 * §6.5). `precalculateNodeTypeSpacings` calls one private helper per pair of its Java comment groups (complexity
 * limits), in Java order. The nested exception lives in `SpacingsUnspecifiedSpacingException.ts` (M15).
 *
 * @author uru
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/Spacings.java
 */
export class Spacings {
  private readonly graph: LGraph;

  private readonly nodeTypeSpacingOptionsHorizontal: SpacingTable;
  private readonly nodeTypeSpacingOptionsVertical: SpacingTable;

  /**
   * @param graph the {@link LGraph} for which to record the spacing values.
   */
  constructor(graph: LGraph) {
    this.graph = graph;

    // pre calculate the spacings between pairs of node types
    const n = NodeType.values().length;
    this.nodeTypeSpacingOptionsHorizontal = newSpacingTable(n);
    this.nodeTypeSpacingOptionsVertical = newSpacingTable(n);
    this.precalculateNodeTypeSpacings();
  }

  private precalculateNodeTypeSpacings(): void {
    this.#precalculateNormalAndLongEdge();
    this.#precalculateNorthSouthAndExternal();
    this.#precalculateLabelAndBreakingPoints();
  }

  /** The `normal` and `longedge` groups of {@link precalculateNodeTypeSpacings}. */
  #precalculateNormalAndLongEdge(): void {
    const O = LayeredOptions;
    // normal
    this.nodeTypeSpacing(NodeType.NORMAL, O.SPACING_NODE_NODE, O.SPACING_NODE_NODE_BETWEEN_LAYERS);
    this.nodeTypeSpacing(NodeType.NORMAL, NodeType.LONG_EDGE, O.SPACING_EDGE_NODE, O.SPACING_EDGE_NODE_BETWEEN_LAYERS);
    this.nodeTypeSpacing(NodeType.NORMAL, NodeType.NORTH_SOUTH_PORT, O.SPACING_EDGE_NODE);
    this.nodeTypeSpacing(NodeType.NORMAL, NodeType.EXTERNAL_PORT, O.SPACING_EDGE_NODE); // TODO
    this.nodeTypeSpacing(NodeType.NORMAL, NodeType.LABEL, O.SPACING_NODE_NODE, O.SPACING_NODE_NODE_BETWEEN_LAYERS);

    // longedge
    this.nodeTypeSpacing(NodeType.LONG_EDGE, O.SPACING_EDGE_EDGE, O.SPACING_EDGE_EDGE_BETWEEN_LAYERS);
    this.nodeTypeSpacing(NodeType.LONG_EDGE, NodeType.NORTH_SOUTH_PORT, O.SPACING_EDGE_EDGE);
    this.nodeTypeSpacing(NodeType.LONG_EDGE, NodeType.EXTERNAL_PORT, O.SPACING_EDGE_EDGE); // TODO
    this.nodeTypeSpacing(NodeType.LONG_EDGE, NodeType.LABEL, O.SPACING_EDGE_NODE, O.SPACING_EDGE_NODE_BETWEEN_LAYERS);
  }

  /** The `northsouth` and `external` groups of {@link precalculateNodeTypeSpacings}. */
  #precalculateNorthSouthAndExternal(): void {
    const O = LayeredOptions;
    // northsouth
    this.nodeTypeSpacing(NodeType.NORTH_SOUTH_PORT, O.SPACING_EDGE_EDGE);
    this.nodeTypeSpacing(NodeType.NORTH_SOUTH_PORT, NodeType.EXTERNAL_PORT, O.SPACING_EDGE_EDGE); // TODO
    this.nodeTypeSpacing(NodeType.NORTH_SOUTH_PORT, NodeType.LABEL, O.SPACING_LABEL_NODE);

    // external
    this.nodeTypeSpacing(NodeType.EXTERNAL_PORT, O.SPACING_PORT_PORT);
    this.nodeTypeSpacing(
      NodeType.EXTERNAL_PORT,
      NodeType.LABEL,
      O.SPACING_LABEL_PORT_VERTICAL,
      O.SPACING_LABEL_PORT_HORIZONTAL,
    );
  }

  /** The `label` and `breaking points` groups of {@link precalculateNodeTypeSpacings}. */
  #precalculateLabelAndBreakingPoints(): void {
    const O = LayeredOptions;
    const BP = NodeType.BREAKING_POINT;
    // label
    this.nodeTypeSpacing(NodeType.LABEL, O.SPACING_EDGE_EDGE, O.SPACING_EDGE_EDGE);

    // breaking points
    this.nodeTypeSpacing(BP, O.SPACING_EDGE_EDGE, O.SPACING_EDGE_EDGE_BETWEEN_LAYERS);
    this.nodeTypeSpacing(BP, NodeType.NORMAL, O.SPACING_EDGE_NODE, O.SPACING_EDGE_NODE_BETWEEN_LAYERS);
    this.nodeTypeSpacing(BP, NodeType.LABEL, O.SPACING_EDGE_NODE, O.SPACING_EDGE_NODE_BETWEEN_LAYERS);
    this.nodeTypeSpacing(BP, NodeType.LONG_EDGE, O.SPACING_EDGE_NODE, O.SPACING_EDGE_NODE_BETWEEN_LAYERS);
  }

  private nodeTypeSpacing(nt: NodeType, spacing: IProperty<number>): void;
  private nodeTypeSpacing(nt: NodeType, spacingVert: IProperty<number>, spacingHorz: IProperty<number>): void;
  private nodeTypeSpacing(n1: NodeType, n2: NodeType, spacing: IProperty<number>): void;
  private nodeTypeSpacing(
    n1: NodeType,
    n2: NodeType,
    spacingVert: IProperty<number>,
    spacingHorz: IProperty<number>,
  ): void;
  private nodeTypeSpacing(...args: NodeTypeSpacingArgs): void {
    if (args[1] instanceof NodeType) {
      this.#pairSpacing(args[0], args[1], args[2] as IProperty<number>, args[3]);
    } else {
      this.#selfSpacing(args[0], args[1], args[2] as IProperty<number> | undefined);
    }
  }

  /** `nodeTypeSpacing(NodeType, IProperty)` and `nodeTypeSpacing(NodeType, IProperty, IProperty)`. */
  #selfSpacing(nt: NodeType, spacingVert: IProperty<number>, spacingHorz: IProperty<number> | undefined): void {
    this.nodeTypeSpacingOptionsVertical[nt.ordinal()]![nt.ordinal()] = spacingVert;

    if (spacingHorz !== undefined) {
      this.nodeTypeSpacingOptionsHorizontal[nt.ordinal()]![nt.ordinal()] = spacingHorz;
    }
  }

  /** `nodeTypeSpacing(NodeType, NodeType, IProperty)` and `nodeTypeSpacing(NodeType, NodeType, IProperty, IProperty)`. */
  #pairSpacing(
    n1: NodeType,
    n2: NodeType,
    spacingVert: IProperty<number>,
    spacingHorz: IProperty<number> | undefined,
  ): void {
    this.nodeTypeSpacingOptionsVertical[n1.ordinal()]![n2.ordinal()] = spacingVert;
    this.nodeTypeSpacingOptionsVertical[n2.ordinal()]![n1.ordinal()] = spacingVert;

    if (spacingHorz !== undefined) {
      this.nodeTypeSpacingOptionsHorizontal[n1.ordinal()]![n2.ordinal()] = spacingHorz;
      this.nodeTypeSpacingOptionsHorizontal[n2.ordinal()]![n1.ordinal()] = spacingHorz;
    }
  }

  /**
   * Returns the horizontal spacing to be preserved between two graph elements, two nodes, or two node types. The
   * graph-element form delegates to the node form when both are nodes and throws otherwise.
   *
   * @throws UnspecifiedSpacingException for two graph elements that are not both nodes
   */
  getHorizontalSpacing(e1: LGraphElement, e2: LGraphElement): number;
  getHorizontalSpacing(nt1: NodeType, nt2: NodeType): number;
  getHorizontalSpacing(a: LGraphElement | NodeType, b: LGraphElement | NodeType): number {
    if (a instanceof NodeType) {
      return this.getLocalSpacing(a, b as NodeType, this.nodeTypeSpacingOptionsHorizontal);
    }
    if (a instanceof LNode && b instanceof LNode) {
      return this.getLocalSpacing(a, b, this.nodeTypeSpacingOptionsHorizontal);
    }

    throw new UnspecifiedSpacingException();
  }

  /** Returns the vertical spacing to be preserved between two nodes or two node types. */
  getVerticalSpacing(n1: LNode, n2: LNode): number;
  getVerticalSpacing(nt1: NodeType, nt2: NodeType): number;
  getVerticalSpacing(a: LNode | NodeType, b: LNode | NodeType): number {
    return this.getLocalSpacing(a, b, this.nodeTypeSpacingOptionsVertical);
  }

  private getLocalSpacing(a: LNode | NodeType, b: LNode | NodeType, nodeTypeSpacingMapping: SpacingTable): number {
    if (a instanceof NodeType) {
      const layoutOption = nodeTypeSpacingMapping[a.ordinal()]![(b as NodeType).ordinal()]!;
      return this.graph.getProperty(layoutOption);
    }

    const n2 = b as LNode;
    const t1 = a.getType();
    const t2 = n2.getType();
    const layoutOption = nodeTypeSpacingMapping[t1.ordinal()]![t2.ordinal()]!;

    // get the spacing value for the first node
    const s1 = Spacings.getIndividualOrDefault(a, layoutOption);
    const s2 = Spacings.getIndividualOrDefault(n2, layoutOption);

    return Math.max(s1, s2);
  }

  /**
   * Returns the value of the given property as it applies to the given node. First checks whether an individual
   * override is set on the node that has the given property configured. If so, the configured value is returned.
   * Otherwise, the node's parent node, if any, is queried.
   *
   * @param node the node whose property value to return.
   * @param property the property.
   * @return the individual override for the property or the default value inherited by the parent node.
   */
  static getIndividualOrDefault<T>(node: LNode, property: IProperty<T>): T {
    let result: T | null = null;
    // check for individual value
    if (node.hasProperty(LayeredOptions.SPACING_INDIVIDUAL)) {
      const individualSpacings = node.getProperty(LayeredOptions.SPACING_INDIVIDUAL);
      if (individualSpacings.hasProperty(property)) {
        result = individualSpacings.getProperty(property);
      }
    }
    // use the common value
    if (result === null) {
      result = node.getGraph()!.getProperty(property);
    }

    return result;
  }
}

/** Java `new IProperty[n][n]`: every cell `null`. */
function newSpacingTable(n: number): SpacingTable {
  return Array.from({ length: n }, () => new Array<IProperty<number> | null>(n).fill(null));
}
