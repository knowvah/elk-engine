// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { MapPropertyHolder } from '../../../../graph/properties/MapPropertyHolder.js';
import { Property } from '../../../../graph/properties/Property.js';
import { BoxedComparable } from '../../../../java/lang/BoxedComparable.js';
import { PortConstraints } from '../../../options/PortConstraints.js';
import { EdgeDetermination } from './EdgeDetermination.js';
import { FileFormat } from './FileFormat.js';
import { GraphType } from './GraphType.js';
import { RandVal } from './RandVal.js';

/**
 * Property holder for random graph generator options. The nested enums `FileFormat`, `GraphType`
 * and `EdgeDetermination` and the nested class `RandVal` are sibling files (translation rule 6.4).
 * `serialVersionUID` is dropped (no Java serialization).
 *
 * @author msp
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/GeneratorOptions.java
 */
export class GeneratorOptions extends MapPropertyHolder {
  // Options for file creation
  /** the preference key for the number of graphs. */
  static readonly NUMBER_OF_GRAPHS: IProperty<number> = new Property<number>('randomWizard.numberOfGraphs', 1);

  /** the preference key for the filename. */
  static readonly FILE_NAME: IProperty<string> = new Property<string>('randomWizard.filename', 'random.kgt');

  /** the preference key for the file format. */
  static readonly FILE_FORMAT: IProperty<FileFormat> = new Property<FileFormat>(
    'randomWizard.fileFormat',
    FileFormat.XTEXT,
  );

  // All other options depend on which GRAPH_TYPE has been selected
  /** option for the graph type. */
  static readonly GRAPH_TYPE: IProperty<GraphType> = new Property<GraphType>('basic.graphType', GraphType.CUSTOM);

  // Options for all graph types
  /** option for the random number of nodes. */
  static readonly NUMBER_OF_NODES: IProperty<RandVal> = new Property<RandVal>('basic.numNodes', RandVal.exact(10));

  /** option for specifying how to determine edges. */
  static readonly EDGE_DETERMINATION: IProperty<EdgeDetermination> = new Property<EdgeDetermination>(
    'basic.edgeDetermination',
    EdgeDetermination.ABSOLUTE,
  );

  /** option for the absolute number of edges. */
  static readonly EDGES_ABSOLUTE: IProperty<RandVal> = new Property<RandVal>('basic.numberOfEdges', RandVal.exact(20));

  /** option for the standard deviation in the absolute number of edges. */
  static readonly RELATIVE_EDGES: IProperty<RandVal> = new Property<RandVal>('basic.relEdges', RandVal.allNil());

  /** option for standard deviation in the relative number of edges. */
  static readonly DENSITY: IProperty<RandVal> = new Property<RandVal>('basic.density', RandVal.allNil());

  /** option that enables hierarchical graphs. */
  static readonly ENABLE_HIERARCHY: IProperty<boolean> = new Property<boolean>('basic.enableHierarchy', false);

  /** option for the chance of creating a compound node. */
  static readonly HIERARCHY_CHANCE: IProperty<number> = new Property<number>(
    'basic.hierarchyChance',
    Math.fround(0.05),
    new BoxedComparable(0.0),
    new BoxedComparable(1.0),
  );

  /** option for the maximum hierarchy level. */
  static readonly MAX_HIERARCHY_LEVEL: IProperty<RandVal> = new Property<RandVal>(
    'basic.maxHierarchyLevel',
    RandVal.exact(3),
  );

  /** option for the factor to calculate the number of nodes in a compound node. */
  static readonly HIERARCHY_NODES_FACTOR: IProperty<number> = new Property<number>(
    'basic.hierarchyNodesFactor',
    Math.fround(0.5),
    new BoxedComparable(0.0),
    null,
  );

  /** option for the chance of creating a hypernode. */
  static readonly HYPERNODE_CHANCE: IProperty<number> = new Property<number>(
    'basic.hypernodeChance',
    Math.fround(0.0),
    new BoxedComparable(0.0),
    new BoxedComparable(1.0),
  );

  /** option for using ports to connect nodes. */
  static readonly ENABLE_PORTS: IProperty<boolean> = new Property<boolean>('basic.ports', false);

  /** option for the chance of edges to use already existing ports. */
  static readonly USE_EXISTING_PORTS_CHANCE: IProperty<RandVal> = new Property<RandVal>(
    'basic.useExistingPortsChance',
    RandVal.exact(0.3),
  );

  /** option for allowing cross-hierarchy edges. */
  static readonly CROSS_HIERARCHY_EDGES: IProperty<boolean> = new Property<boolean>('basic.crossHierarchyEdges', false);

  /** option for using a time-based randomization seed. */
  static readonly TIME_BASED_RANDOMIZATION: IProperty<boolean> = new Property<boolean>(
    'basic.timeBasedRandomization',
    true,
  );

  /** option for the fixed randomization seed value. */
  static readonly RANDOMIZATION_SEED: IProperty<number> = new Property<number>('basic.randomizationSeed', 0);

  /** option for setting the size of nodes. */
  static readonly SET_NODE_SIZE: IProperty<boolean> = new Property<boolean>('basic.setNodeSize', true);

  /** option for the random width of nodes. */
  static readonly NODE_WIDTH: IProperty<RandVal> = new Property<RandVal>('basic.minNodeWidth', RandVal.exact(30));

  /** option for the random height of nodes. */
  static readonly NODE_HEIGHT: IProperty<RandVal> = new Property<RandVal>('basic.minNodeHeight', RandVal.exact(30));

  /** option for creating node labels. */
  static readonly CREATE_NODE_LABELS: IProperty<boolean> = new Property<boolean>('basic.createNodeLabels', false);

  /** option for setting the size of ports. */
  static readonly SET_PORT_SIZE: IProperty<boolean> = new Property<boolean>('basic.setPortSize', true);

  /** option for setting the size of ports. */
  static readonly PORT_WIDTH: IProperty<RandVal> = new Property<RandVal>('basic.portWidth', RandVal.exact(4));

  /** option for setting the size of ports. */
  static readonly PORT_HEIGHT: IProperty<RandVal> = new Property<RandVal>('basic.portHeight', RandVal.exact(4));

  /** option for setting the size of ports. */
  static readonly CREATE_PORT_LABELS: IProperty<boolean> = new Property<boolean>('basic.createPortLabels', false);

  // Layout options
  /** option for port constraints. */
  static readonly PORT_CONSTRAINTS: IProperty<PortConstraints> = new Property<PortConstraints>(
    'layout.portConstraints',
    PortConstraints.UNDEFINED,
  );

  /** option for relative probability of incoming edges on the north side. */
  static readonly INCOMING_NORTH_SIDE: IProperty<number> = new Property<number>('layout.incomingNorthSide', 10);

  /** option for relative probability of incoming edges on the east side. */
  static readonly INCOMING_EAST_SIDE: IProperty<number> = new Property<number>('layout.incomingEastSide', 5);

  /** option for relative probability of incoming edges on the south side. */
  static readonly INCOMING_SOUTH_SIDE: IProperty<number> = new Property<number>('layout.incomingSouthSide', 10);

  /** option for relative probability of incoming edges on the west side. */
  static readonly INCOMING_WEST_SIDE: IProperty<number> = new Property<number>('layout.incomingWestSide', 75);

  /** option for relative probability of outgoing edges on the north side. */
  static readonly OUTGOING_NORTH_SIDE: IProperty<number> = new Property<number>('layout.outgoingNorthSide', 10);

  /** option for relative probability of outgoing edges on the east side. */
  static readonly OUTGOING_EAST_SIDE: IProperty<number> = new Property<number>('layout.outgoingEastSide', 75);

  /** option for relative probability of outgoing edges on the south side. */
  static readonly OUTGOING_SOUTH_SIDE: IProperty<number> = new Property<number>('layout.outgoingSouthSide', 10);

  /** option for relative probability of outgoing edges on the west side. */
  static readonly OUTGOING_WEST_SIDE: IProperty<number> = new Property<number>('layout.outgoingWestSide', 5);

  // Options for GRAPH_TYPE CUSTOM
  /** option for the minimum number of outgoing edges. */
  static readonly OUTGOING_EDGES: IProperty<RandVal> = new Property<RandVal>(
    'basic.minOutgoingEdges',
    RandVal.allNil(),
  );

  /** option for allowing self-loops. */
  static readonly SELF_LOOPS: IProperty<boolean> = new Property<boolean>('basic.selfLoops', false);

  /** option for allowing multi-edges. */
  static readonly MULTI_EDGES: IProperty<boolean> = new Property<boolean>('basic.multiEdges', true);

  /** option for allowing cycles. */
  static readonly CYCLES: IProperty<boolean> = new Property<boolean>('basic.cycles', true);

  /** option for allowing isolated nodes. */
  static readonly ISOLATED_NODES: IProperty<boolean> = new Property<boolean>('basic.isolatedNodes', true);

  /** option for generating random edge labels. */
  static readonly EDGE_LABELS: Property<boolean> = new Property<boolean>('basic.edgeLabels', false);

  // Options for GRAPH_TYPE TREE
  /** option for the maximum tree width ('0' meaning unlimited). */
  static readonly MAX_WIDTH: IProperty<number> = new Property<number>('basic.maxWidth', 0);

  /** option for the maximum degree ('0' meaning unlimited). */
  static readonly MAX_DEGREE: IProperty<number> = new Property<number>('basic.maxDegree', 0);

  // Options for GRAPH_TYPE ACYCLIC_NO_TRANSITIVE_EDGES
  /** option for planarity. */
  static readonly PLANAR: IProperty<boolean> = new Property<boolean>('basic.planar', false);

  // Options for GRAPH_TYPE BIPARTITE
  /** option for minimal fraction of nodes in second partition set. */
  static readonly PARTITION_FRAC: IProperty<RandVal> = new Property<RandVal>(
    'basic.minPartitionFraction',
    RandVal.exact(Math.fround(0.4)),
  );

  // Options for GRAPH_TYPE HIERARCHICAL
  static readonly SMALL_HIERARCHY: IProperty<boolean> = new Property<boolean>('basic.SMALL_HIERARCHY', false);

  /** Number of hierarchical nodes per graph. */
  static readonly NUMBER_HIERARCHICAL_NODES: IProperty<RandVal> = new Property<RandVal>(
    'basic.HIERARCH_NODE',
    RandVal.allNil(),
  );

  // TODO-alan rename.
  static readonly CROSS_HIER: IProperty<RandVal> = new Property<RandVal>('basic.CROSS_HIER', RandVal.allNil());

  static readonly EXACT_RELATIVE_HIER: IProperty<RandVal> = new Property<RandVal>('basic.EXACT_RELATIVE_HIER');
}
