// SPDX-License-Identifier: EPL-2.0
import type { LabelCell } from '../../common/nodespacing/cellsystem/LabelCell.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { KVector } from '../../../core/math/KVector.js';
import type { KVectorChain } from '../../../core/math/KVectorChain.js';
import { LabelSide } from '../../../core/options/LabelSide.js';
import type { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { Property } from '../../../graph/properties/Property.js';
import type { Multimap } from '../../../guava/Multimap.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import type { Random } from '../../../java/util/Random.js';
import type { CrossHierarchyEdge } from '../compound/CrossHierarchyEdge.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LLabel } from '../graph/LLabel.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import type { SelfLoopHolder } from '../intermediate/loops/SelfLoopHolder.js';
import type { BPInfo } from '../intermediate/wrapping/BreakingPointInserterBPInfo.js';
import type { SplineSegment } from '../p5edges/splines/SplineSegment.js';
import { EdgeConstraint } from './EdgeConstraint.js';
import { GraphProperties } from './GraphProperties.js';
import { InLayerConstraint } from './InLayerConstraint.js';
import type { Spacings } from './Spacings.js';

/**
 * Container for property definitions for internal use of the algorithm. These properties should not be accessed from
 * outside. Some properties here are redefinitions of layout options in `LayeredOptions` to change their defaults.
 *
 * Ids and defaults are verbatim, including the shared id of `FIRST_TRY_WITH_INITIAL_ORDER` and
 * `SECOND_TRY_WITH_INITIAL_ORDER`. Javadoc links to unported classes (`FinalSplineBendpointsCalculator`,
 * `LayerConstraintPreprocessor`, `SplineEdgeRouter`, `InLayerConstraintProcessor`, `PartitionPreprocessor`) are text.
 * Java `Set` properties defaulting to `EnumSet.noneOf` are typed `EnumSet`. An explicit `null` default (`LONG_EDGE_SOURCE`,
 * `LONG_EDGE_TARGET`) is the same as none.
 *
 * @author msp
 * @author cds
 * @author uru
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/InternalProperties.java
 */
export class InternalProperties {
  /** The original object from which a graph element was created. */
  static readonly ORIGIN: IProperty<unknown> = new Property<unknown>('origin');

  /** The {@link LGraph} the coordinates of a cross-hierarchy edge are relative to. */
  static readonly COORDINATE_SYSTEM_ORIGIN: IProperty<LGraph> = new Property<LGraph>('coordinateOrigin');

  /** The list of layout processors executed for an input graph. */
  static readonly PROCESSORS: IProperty<ILayoutProcessor<LGraph>[]> = new Property<ILayoutProcessor<LGraph>[]>(
    'processors',
  );

  /**
   * Whether the original node an LNode was created from was a compound node or not. This might influence certain
   * layout decisions, such as where to place inside port labels so that they don't overlap edges.
   */
  static readonly COMPOUND_NODE: IProperty<boolean> = new Property<boolean>('compoundNode', false);

  /**
   * Whether the original port an LPort was created from was a compound port with connections to or from descendants
   * of its node. This might influence certain layout decisions, such as where to place its inside port label.
   */
  static readonly INSIDE_CONNECTIONS: IProperty<boolean> = new Property<boolean>('insideConnections', false);

  /** The original bend points of an edge. */
  static readonly ORIGINAL_BENDPOINTS: IProperty<KVectorChain> = new Property<KVectorChain>('originalBendpoints');

  /**
   * In interactive layout settings, this property can be set to indicate where a dummy node that represents an edge
   * in a given layer was probably placed in that layer. This information can be calculated during the crossing
   * minimization phase and later be used by an interactive node placement algorithm.
   */
  static readonly ORIGINAL_DUMMY_NODE_POSITION: IProperty<number> = new Property<number>('originalDummyNodePosition');

  /**
   * The edge a label originally belonged to. This property was introduced to remember which cross-hierarchy edge a
   * label originally belonged to.
   */
  static readonly ORIGINAL_LABEL_EDGE: IProperty<LEdge> = new Property<LEdge>('originalLabelEdge');

  /** Edge labels represented by an edge label dummy node. */
  static readonly REPRESENTED_LABELS: IProperty<LLabel[]> = new Property<LLabel[]>('representedLabels');

  /**
   * If any edge incident to a node has end labels, those are stored in one label cell per port by the end label
   * processors.
   */
  static readonly END_LABELS: IProperty<Map<LPort, LabelCell>> = new Property<Map<LPort, LabelCell>>('endLabels');

  /** The edge an end label belongs to. */
  static readonly END_LABEL_EDGE: IProperty<LEdge> = new Property<LEdge>('endLabel.origin');

  /** The side (of an edge) a label is placed on. */
  static readonly LABEL_SIDE: IProperty<LabelSide> = new Property<LabelSide>('labelSide', LabelSide.UNKNOWN);

  /** The maximum thickness of any edge connected to a port. */
  static readonly MAX_EDGE_THICKNESS: IProperty<number> = new Property<number>('maxEdgeThickness', 0.0);

  /** Flag for reversed edges. */
  static readonly REVERSED: IProperty<boolean> = new Property<boolean>('reversed', false);

  /** Random number generator for the algorithm. */
  static readonly RANDOM: IProperty<Random> = new Property<Random>('random');

  /** The source port of a long edge before it was broken into multiple segments. */
  static readonly LONG_EDGE_SOURCE: IProperty<LPort> = new Property<LPort>('longEdgeSource');

  /** The target port of a long edge before it was broken into multiple segments. */
  static readonly LONG_EDGE_TARGET: IProperty<LPort> = new Property<LPort>('longEdgeTarget');

  /**
   * Set on long edge dummies to indicate whether someplace in the long edge is a label dummy. This can for example
   * influence decisions on how to merge long edge dummies.
   */
  static readonly LONG_EDGE_HAS_LABEL_DUMMIES: IProperty<boolean> = new Property<boolean>(
    'longEdgeHasLabelDummies',
    false,
  );

  /**
   * If a long edge has a label dummy somewhere, this property indicates for every long edge dummy whether or not it
   * comes before that label dummy (`true`) or not (`false`). Coming before a label dummy in this case means being in a
   * layer left of the label dummy.
   */
  static readonly LONG_EDGE_BEFORE_LABEL_DUMMY: IProperty<boolean> = new Property<boolean>(
    'longEdgeBeforeLabelDummy',
    false,
  );

  /** Edge constraints for nodes. */
  static readonly EDGE_CONSTRAINT: IProperty<EdgeConstraint> = new Property<EdgeConstraint>(
    'edgeConstraint',
    EdgeConstraint.NONE,
  );

  /**
   * The layout unit a node belongs to. This property only makes sense for nodes. A layout unit is a set of nodes
   * between which no nodes belonging to other layout units may be placed. Nodes not belonging to any layout unit may
   * be placed arbitrarily between nodes of a layout unit. Layer layout units are identified through one of their
   * nodes. The idea behind the latter is that for instance long edge dummies can be placed between an original node
   * and one of its north port dummy nodes. It results in an edge crossing.
   */
  static readonly IN_LAYER_LAYOUT_UNIT: IProperty<LNode> = new Property<LNode>('inLayerLayoutUnit');

  /**
   * The in-layer constraint placed on a node. This indicates whether this node should be handled like any other node,
   * or if it must be placed at the top or bottom of a layer. This is important for external port dummy nodes.
   * Crossing minimizers are not required to respect this constraint. If they don't, however, they must include a
   * dependency on `InLayerConstraintProcessor`.
   */
  static readonly IN_LAYER_CONSTRAINT: IProperty<InLayerConstraint> = new Property<InLayerConstraint>(
    'inLayerConstraint',
    InLayerConstraint.NONE,
  );

  /**
   * Indicates that a node `x` may only appear inside a layer before the node `y` the property is set to. That is,
   * having `x` appear after `y` would violate this constraint. This property only makes sense for nodes.
   */
  static readonly IN_LAYER_SUCCESSOR_CONSTRAINTS: IProperty<LNode[]> = new Property<LNode[]>(
    'inLayerSuccessorConstraint',
    [],
  );

  /**
   * Set to `true` if there are in-layer successor constraints between regular nodes. If that is the case, constraint
   * resolvers may have to know.
   */
  static readonly IN_LAYER_SUCCESSOR_CONSTRAINTS_BETWEEN_NON_DUMMIES: IProperty<boolean> = new Property<boolean>(
    'inLayerSuccessorConstraintBetweenNonDummies',
    false,
  );

  /**
   * A property set on ports indicating a dummy node created for that port. This is not set for all ports that have
   * dummy nodes created for them.
   */
  static readonly PORT_DUMMY: IProperty<LNode> = new Property<LNode>('portDummy');

  /**
   * Crossing hint used for in-layer cross counting with northern and southern port dummies. This is effectively the
   * number of different ports a northern or southern port dummy represents.
   */
  static readonly CROSSING_HINT: IProperty<number> = new Property<number>('crossingHint', 0);

  /** Flags indicating the properties of a graph. */
  static readonly GRAPH_PROPERTIES: IProperty<EnumSet<GraphProperties>> = new Property<EnumSet<GraphProperties>>(
    'graphProperties',
    EnumSet.noneOf(GraphProperties),
  );

  /** The side of an external port a dummy node was created for. */
  static readonly EXT_PORT_SIDE: IProperty<PortSide> = new Property<PortSide>('externalPortSide', PortSide.UNDEFINED);

  /** Original size of the external port a dummy node was created for. */
  static readonly EXT_PORT_SIZE: IProperty<KVector> = new Property<KVector>('externalPortSize', new KVector());

  /**
   * External port dummies that represent northern or southern external ports are replaced by new dummy nodes during
   * layout. The original ones are kept in this property set on the graph.
   */
  static readonly EXT_PORT_REPLACED_DUMMIES: IProperty<LNode[]> = new Property<LNode[]>('externalPortReplacedDummies');

  /**
   * External port dummies that represent northern or southern external ports are replaced by new dummy nodes during
   * layout. In these cases, this property is set to the original dummy node.
   */
  static readonly EXT_PORT_REPLACED_DUMMY: IProperty<LNode> = new Property<LNode>('externalPortReplacedDummy');

  /**
   * The port sides of external ports a connected component connects to. This property is set on the layered graph
   * that represents a connected component and defaults to no connections. If a connected component connects to an
   * external port on the EAST side and to another external port on the NORTH side, this enumeration will list both
   * sides.
   */
  static readonly EXT_PORT_CONNECTIONS: IProperty<EnumSet<PortSide>> = new Property<EnumSet<PortSide>>(
    'externalPortConnections',
    EnumSet.noneOf(PortSide),
  );

  /**
   * The original position or position-to-node-size ratio of a port. This property has two use cases:
   * 1. For external port dummies. In this use case, the property gives the original position of the external port (if
   *    port constraints are set to `FIXED_POS`) or the original position-to-node-size ratio of the external port ((if
   *    port constraints are set to `FIXED_RATIO`).
   * 2. For ports of regular nodes with port constraints set to `FIXED_RATIO`. Since regular nodes may be resized, the
   *    original ratio must be remembered for the new port position to be determined.
   *
   * This is a one-dimensional value since the side of the port determines the other dimension. (For eastern and
   * western ports, the x coordinate is determined automatically; for northern and southern ports, the y coordinate is
   * determined automatically)
   */
  static readonly PORT_RATIO_OR_POSITION: IProperty<number> = new Property<number>('portRatioOrPosition', 0.0);

  /**
   * A list of nodes whose barycenters should go into the barycenter calculation of the node this property is set on.
   * Nodes in this list are expected to be in the same layer as the node the property is set on. This is primarily used
   * when edges are rerouted from a node to dummy nodes.
   *
   * This property is currently not declared as one of the layout options offered by ELK Layered and should be
   * considered highly experimental.
   */
  static readonly BARYCENTER_ASSOCIATES: IProperty<LNode[]> = new Property<LNode[]>('barycenterAssociates');

  /** List of comment boxes that are placed on top of a node. */
  static readonly TOP_COMMENTS: IProperty<LNode[]> = new Property<LNode[]>('TopSideComments');

  /** List of comment boxes that are placed in the bottom of of a node. */
  static readonly BOTTOM_COMMENTS: IProperty<LNode[]> = new Property<LNode[]>('BottomSideComments');

  /** The port of a node that originally connected a comment box with that node. */
  static readonly COMMENT_CONN_PORT: IProperty<LPort> = new Property<LPort>('CommentConnectionPort');

  /** Whether a port is used to collect all incoming edges of a node. */
  static readonly INPUT_COLLECT: IProperty<boolean> = new Property<boolean>('inputCollect', false);
  /** Whether a port is used to collect all outgoing edges of a node. */
  static readonly OUTPUT_COLLECT: IProperty<boolean> = new Property<boolean>('outputCollect', false);

  /**
   * Property of a LayeredGraph. Whether the graph has been processed by the cycle breaker and the cycle breaker has
   * detected cycles and reverted edges.
   */
  static readonly CYCLIC: IProperty<boolean> = new Property<boolean>('cyclic', false);

  /** Map of original hierarchy crossing edges to a set of dummy edges by which the original edge has been replaced. */
  static readonly CROSS_HIERARCHY_MAP: IProperty<Multimap<LEdge, CrossHierarchyEdge>> = new Property<
    Multimap<LEdge, CrossHierarchyEdge>
  >('crossHierarchyMap');

  /** Offset to be added to the target anchor point of an edge when the layout is applied back to the origin. */
  static readonly TARGET_OFFSET: IProperty<KVector> = new Property<KVector>('targetOffset');

  /** Combined size of all edge labels of a spline self loop. */
  static readonly SPLINE_LABEL_SIZE: IProperty<KVector> = new Property<KVector>('splineLabelSize', new KVector());

  /** Internal container for all possible spacing variations that we support. */
  static readonly SPACINGS: IProperty<Spacings> = new Property<Spacings>('spacings');

  /** Specifies if the corresponding LGraph element was added by the `PartitionPreprocessor`. */
  static readonly PARTITION_DUMMY: IProperty<boolean> = new Property<boolean>('partitionConstraint', false);

  /**
   * Holds information about a breaking point, e.g. the start dummy node, the end dummy node and the original edge
   * that was split.
   *
   * @see BreakingPointInserter
   */
  static readonly BREAKING_POINT_INFO: IProperty<BPInfo> = new Property<BPInfo>('breakingPoint.info');

  /**
   * The edge to which to assign the final bendpoints when edges are routed as splines. By default this is the first
   * edge of the {@link InternalProperties.SPLINE_EDGE_CHAIN}, in which case this property should be `null`. However,
   * in certain scenarios, e.g. if graph wrapping is used, the edge must be specified explicitly. This must be done
   * using this property.
   */
  static readonly SPLINE_SURVIVING_EDGE: IProperty<LEdge> = new Property<LEdge>('splines.survivingEdge');

  /**
   * Collection of all spline routes created by the `SplineEdgeRouter`. Set on an {@link LEdge}, to be read by the
   * `FinalSplineBendpointsCalculator`.
   */
  static readonly SPLINE_ROUTE_START: IProperty<SplineSegment[]> = new Property<SplineSegment[]>('splines.route.start');

  /**
   * Collection of all edge chains as computed by the `SplineEdgeRouter`. Set on an {@link LEdge}, to be read by the
   * `FinalSplineBendpointsCalculator`.
   */
  static readonly SPLINE_EDGE_CHAIN: IProperty<LEdge[]> = new Property<LEdge[]>('splines.edgeChain');

  /** Holds the information about the originally user set port constraints. */
  static readonly ORIGINAL_PORT_CONSTRAINTS: IProperty<PortConstraints> = new Property<PortConstraints>(
    'originalPortConstraints',
  );

  /** Holds all of the information necessary to route self loops around a node. */
  static readonly SELF_LOOP_HOLDER: IProperty<SelfLoopHolder> = new Property<SelfLoopHolder>('selfLoopHolder');

  /**
   * Holds the y-coordinate of a deleted `NodeType.NORTH_SOUTH_PORT` dummy node. To be read by the
   * `FinalSplineBendpointsCalculator`.
   */
  static readonly SPLINE_NS_PORT_Y_COORD: IProperty<number> = new Property<number>('splines.nsPortY');

  /** Set for nodes and edges to preserve the order in the model file. */
  static readonly MODEL_ORDER: IProperty<number> = new Property<number>('modelOrder');

  /** Set on parents to save the maximum model order set on nodes. */
  static readonly MAX_MODEL_ORDER_NODES: IProperty<number> = new Property<number>('modelOrder.maximum');

  /** Set on parents to save the number of model order groups for cycle breaking. */
  static readonly CB_NUM_MODEL_ORDER_GROUPS: IProperty<number> = new Property<number>('modelOrderGroups.cb.number');

  /**
   * Set on ports to save their (long edge) target node. Only used during port sorting if the node/edge order shall be
   * preserved.
   */
  static readonly LONG_EDGE_TARGET_NODE: IProperty<LNode> = new Property<LNode>('longEdgeTargetNode');

  /**
   * Set during crossing minimization on a graph to signal that crossing minimization should not shuffle the free
   * nodes. This also fixes the initial sweep direction to forward.
   */
  static readonly FIRST_TRY_WITH_INITIAL_ORDER: IProperty<boolean> = new Property<boolean>(
    'firstTryWithInitialOrder',
    false,
  );

  /**
   * Set during crossing minimization on a graph to signal that crossing minimization should not shuffle the free
   * nodes. This also fixes the initial sweep direction to backwards (since the previous one was forward).
   */
  static readonly SECOND_TRY_WITH_INITIAL_ORDER: IProperty<boolean> = new Property<boolean>(
    'firstTryWithInitialOrder',
    false,
  );

  /** List of nodes hidden by the `LayerConstraintPreprocessor`. Set on graphs. */
  static readonly HIDDEN_NODES: IProperty<LNode[]> = new Property<LNode[]>('layerConstraints.hiddenNodes');

  /**
   * The port a hidden edge was originally connected to before `LayerConstraintPreprocessor` temporarily disconnected
   * it. Set on edges.
   */
  static readonly ORIGINAL_OPPOSITE_PORT: IProperty<LPort> = new Property<LPort>('layerConstraints.opposidePort');

  /** Holds the model order of the target nodes of a port. This is used to cache this once it was calculated. */
  static readonly TARGET_NODE_MODEL_ORDER: IProperty<Map<LNode, number>> = new Property<Map<LNode, number>>(
    'targetNode.modelOrder',
  );

  /**
   * Tarjans lowlink. The low-link value is initially equal to which number the node has during the initial DFS. If
   * it's the first node visited, the value will be 0. If it's the second node, it will be 1. The third node has value
   * 2, the fourth value 3, etc.
   */
  static readonly TARJAN_LOWLINK: IProperty<number> = new Property<number>('tarjan.lowlink', JavaInteger.MAX_VALUE);

  /** Tarjan node index. */
  static readonly TARJAN_ID: IProperty<number> = new Property<number>('tarjan.id', -1);

  /** Trajan on stack property. Marks if a node is on the current depth-first stack. */
  static readonly TARJAN_ON_STACK: IProperty<boolean> = new Property<boolean>('tarjan.onstack', false);

  /** Set during tarjan's algorithm. Indicates that a node is part of a cycle. */
  static readonly IS_PART_OF_CYCLE: IProperty<boolean> = new Property<boolean>('partOfCycle', false);

  /** The weight of a node as used by the MedianHeuristic class. */
  static readonly WEIGHT: IProperty<number> = new Property<number>('medianHeuristic.weight');

  /** Hidden default constructor. */
  private constructor() {}
}
