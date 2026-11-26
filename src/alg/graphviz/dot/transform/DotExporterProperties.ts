// SPDX-License-Identifier: EPL-2.0
import type { ElkGraphElement } from '../../../../graph/ElkGraphElement.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { Property } from '../../../../graph/properties/Property.js';
import type { BiMap } from '../../../../guava/HashBiMap.js';
import * as Float32 from '../../../../java/lang/Float32.js';
import { Command } from './Command.js';

/**
 * The static fields of `DotExporter`, in Java order, shared by the class (`DotExporter.ts`, which exposes the public
 * and protected ones as its statics) and the layout transfer (`DotExporterTransfer.ts`), which the 500-line limit
 * splits off. The Java-private ones are internal to these files.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */

/** small default value for minimal spacing. */
export const DEF_SPACING_SMALL = 20.0;
/** large default value for minimal spacing. */
export const DEF_SPACING_LARGE = 40.0;
/** extra-large default value for minimal spacing. */
export const DEF_SPACING_XLARGE = 60.0;
/** dots per inch specification, needed by Graphviz for some values: a Java `float` (`72.0f`) widened in double arithmetic. */
export const DPI: number = Float32.fromDouble(72.0);

/** the Graphviz command to use for transformation. */
export const COMMAND: IProperty<Command> = new Property<Command>('dotExporter.command', Command.DOT);
/** whether edge identifiers should be generated or not. */
export const USE_EDGE_IDS: IProperty<boolean> = new Property<boolean>('dotExporter.useEdgeIds', false);
/** whether to transform all hierarchy levels of the graph. */
export const HIERARCHY: IProperty<boolean> = new Property<boolean>('dotExporter.hierarchy', false);
/** whether to transform the layout information of nodes. */
export const TRANSFORM_NODE_LAYOUT: IProperty<boolean> = new Property<boolean>('dotExporter.transformNodeLayout', true);
/** whether to transform the layout information of edges. */
export const TRANSFORM_EDGE_LAYOUT: IProperty<boolean> = new Property<boolean>('dotExporter.transformEdgeLayout', true);
/** whether to transform node labels. */
export const TRANSFORM_NODE_LABELS: IProperty<boolean> = new Property<boolean>('dotExporter.transformNodeLabels', true);
/** whether to adapt port positions to edge end points. */
export const ADAPT_PORT_POSITIONS: IProperty<boolean> = new Property<boolean>('dotExporter.adaptPortPositions', false);

/** default multiplier for font sizes. */
export const FONT_SIZE_MULT = 1.4;
/** set of delimiters used to parse attribute values. */
export const ATTRIBUTE_DELIM = '", \t\n\r';

/**
 * maps each identifier of a graph element to the instance of the element. Keys may be `null`: `transferLayout` looks up
 * the `comment` of an edge statement that has none, which Guava's `HashBiMap` answers with `null`.
 */
export const GRAPH_ELEMS: IProperty<BiMap<string | null, ElkGraphElement> | null> = new Property<BiMap<
  string | null,
  ElkGraphElement
> | null>('dotExporter.graphElemMap');
/** indicates whether splines are used. */
export const USE_SPLINES: IProperty<boolean> = new Property<boolean>('dotExporter.useSplines', false);
/** the next node identifier to use. */
export const NEXT_NODE_ID: IProperty<number> = new Property<number>('dotExporter.nextNodeId', 1);
/** the next edge identifier to use. */
export const NEXT_EDGE_ID: IProperty<number> = new Property<number>('dotExporter.nextEdgeId', 1);
/** cluster dummy node identifier attached to a node. */
export const CLUSTER_DUMMY: IProperty<string | null> = new Property<string | null>('dotExporter.clusterDummy');
