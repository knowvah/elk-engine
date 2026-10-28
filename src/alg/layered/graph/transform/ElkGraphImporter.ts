// SPDX-License-Identifier: EPL-2.0
import { HierarchyHandling } from '../../../../core/options/HierarchyHandling.js';
import type { ElkNode } from '../../../../graph/ElkNode.js';
import { GraphProperties } from '../../options/GraphProperties.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { LayeredSpacings } from '../../options/LayeredSpacings.js';
import type { LGraph } from '../LGraph.js';
import {
  calculateMinimumGraphSize,
  ensureDefinedPortSide,
  shouldCalculateMinimumGraphSize,
} from './ElkGraphImporterEntryPoints.js';
import { checkExternalPorts, transformExternalPort } from './ElkGraphImporterExternalPorts.js';
import { importFlatGraph } from './ElkGraphImporterFlat.js';
import { createLGraph } from './ElkGraphImporterGraphs.js';
import { importHierarchicalGraph } from './ElkGraphImporterHierarchical.js';
import type { NodeAndPortMap } from './ElkGraphImporterMap.js';

/**
 * Implements the graph import aspect of `ElkGraphTransformer`.
 *
 * Facade over section modules split at the Java section comments (P1; sections never import the facade):
 * `ElkGraphImporterEntryPoints` and `ElkGraphImporterModelOrder` (the helpers of "Import Entry Points"),
 * `ElkGraphImporterFlat` and `ElkGraphImporterHierarchical` (its two import modes), `ElkGraphImporterGraphs`
 * ("Graph Transformation"), `ElkGraphImporterExternalPorts`, `ElkGraphImporterNodes` ("Node Transformation"),
 * `ElkGraphImporterPorts`, `ElkGraphImporterEdges` and `ElkGraphImporterLabels`. The section functions take the
 * importer's node map as their first argument.
 *
 * AD-10: the Java has three hash-based sites (`ElkGraphImporter.java:83` `nodeAndPortMap`, `:237` and `:316`
 * `HashSet<Integer>` of model order groups). The map is only read by key and the sets only by size, so insertion
 * order cannot be observed.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphImporter.java
 */
export class ElkGraphImporter {
  /** map between ElkGraph nodes / ports and the LGraph nodes / ports created for them. */
  private readonly nodeAndPortMap: NodeAndPortMap = new Map();

  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Import Entry Points

  /**
   * Imports the given graph.
   *
   * @param elkgraph the graph to import.
   * @return the transformed graph.
   */
  importGraph(elkgraph: ElkNode): LGraph {
    // Create the layered graph
    const topLevelGraph = createLGraph(elkgraph);

    // Assign defined port sides to all external ports
    for (const elkport of elkgraph.getPorts()) {
      ensureDefinedPortSide(topLevelGraph, elkport);
    }

    // Transform the external ports, if any
    const graphProperties = topLevelGraph.getProperty(InternalProperties.GRAPH_PROPERTIES);
    checkExternalPorts(elkgraph, graphProperties);
    if (graphProperties.contains(GraphProperties.EXTERNAL_PORTS)) {
      for (const elkport of elkgraph.getPorts()) {
        transformExternalPort(this.nodeAndPortMap, elkgraph, topLevelGraph, elkport);
      }
    }

    // Calculate the graph's minimum size
    if (shouldCalculateMinimumGraphSize(elkgraph)) {
      calculateMinimumGraphSize(elkgraph, topLevelGraph);
    }

    // Remember things
    if (topLevelGraph.getProperty(LayeredOptions.PARTITIONING_ACTIVATE)) {
      graphProperties.add(GraphProperties.PARTITIONS);
    }

    // Apply a spacing configuration based on a base value (if it has been requested)
    //  Note that the computed spacing values are set on the lgraph and not the elkgraph to avoid polluting
    //  the input graph. If the spacing values were set on the input graph, a second layout run of the same
    //  input graph - with a different base value - would yield an unexpected result as the computed spacing
    //  values of the first layout run would be used (explicitly set spacing values are not overwritten).
    if (topLevelGraph.hasProperty(LayeredOptions.SPACING_BASE_VALUE)) {
      LayeredSpacings.withBaseValue(topLevelGraph.getProperty(LayeredOptions.SPACING_BASE_VALUE)).apply(topLevelGraph);
    }

    // Import the graph either with or without multiple nested levels of hierarchy
    if (elkgraph.getProperty(LayeredOptions.HIERARCHY_HANDLING) === HierarchyHandling.INCLUDE_CHILDREN) {
      importHierarchicalGraph(this.nodeAndPortMap, elkgraph, topLevelGraph);
    } else {
      importFlatGraph(this.nodeAndPortMap, elkgraph, topLevelGraph);
    }

    return topLevelGraph;
  }
}
