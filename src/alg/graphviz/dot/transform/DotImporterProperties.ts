// SPDX-License-Identifier: EPL-2.0
import type { Pair } from '../../../../core/util/Pair.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { ElkPort } from '../../../../graph/ElkPort.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { Property } from '../../../../graph/properties/Property.js';
import type { JavaHashMap } from '../../../../java/util/JavaHashMap.js';
import type { Graph } from '../dot/Graph.js';
import type { Statement } from '../dot/Statement.js';

// The private static property constants of DotImporter, in a file of their own so that the parts the class is split
// into (DotImporter*.ts, for the 500-line limit) share them without an import cycle.

/**
 * Map of Graphviz node identifiers to their KNode instances. Java `Maps.newHashMap()` with `String` keys, only read
 * with `get` and written with `put` (never iterated, so its order is not observable, AD-10): a JS `Map`. A `null`
 * key is looked up (an anonymous subgraph target) but never stored, as in Java.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export const NODE_ID_MAP: IProperty<Map<string | null, ElkNode>> = new Property<Map<string | null, ElkNode>>(
  'nodeIdMap',
);

/**
 * Map of Graphviz port identifiers to their KPort instances. Java `Maps.newHashMap()` keyed by
 * `Pair<ElkNode, String>`, whose `equals`/`hashCode` are by value: a `JavaHashMap` with the pair's own hash
 * (`HashStrategy.hashable`), so a fresh pair finds the entry of an equal one. Only `get` and `put` (never
 * iterated, AD-10).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export const PORT_ID_MAP: IProperty<JavaHashMap<Pair<ElkNode, string | null>, ElkPort>> = new Property<
  JavaHashMap<Pair<ElkNode, string | null>, ElkPort>
>('portIdMap');

/**
 * Original Graphviz statements attached to graph elements.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export const PROP_STATEMENT: IProperty<Statement | null> = new Property<Statement | null>('dotTransformer.statement');

/**
 * Original Graphviz identifiers attached to graph elements.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export const PROP_ID: IProperty<string | null> = new Property<string | null>('dotTransformer.name');

/**
 * Original Graphviz graph attached to parent nodes.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export const PROP_GRAPH: IProperty<Graph | null> = new Property<Graph | null>('dotTransformer.graph');

/**
 * Default node width to apply for all nodes (a Java `Float`: the value is a float, `Float32`).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export const PROP_DEF_WIDTH: IProperty<number | null> = new Property<number | null>('dotTransformer.defWidth');

/**
 * Default node height to apply for all nodes (a Java `Float`: the value is a float, `Float32`).
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotImporter.java
 */
export const PROP_DEF_HEIGHT: IProperty<number | null> = new Property<number | null>('dotTransformer.defHeight');
