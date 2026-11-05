// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import type { KVectorChain } from '../../../core/math/KVectorChain.js';
import type { LGraph } from '../graph/LGraph.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Abstract base class for connected components placers: combines the laid out components of a graph into one target
 * graph.
 *
 * @author msp
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/AbstractGraphPlacer.java
 */
export abstract class AbstractGraphPlacer {
  /**
   * Combine the given list of components into the target graph.
   *
   * @param components a list of components; the placer may reorder it
   * @param target the target graph
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/AbstractGraphPlacer.java
   */
  abstract combine(components: LGraph[], target: LGraph): void;

  /**
   * Move the content of all source graphs into the destination graph, offsetting it by the graph offset plus the given
   * values.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/AbstractGraphPlacer.java
   */
  protected moveGraphs(destGraph: LGraph, sourceGraphs: Iterable<LGraph>, offsetx: number, offsety: number): void {
    for (const sourceGraph of sourceGraphs) {
      this.moveGraph(destGraph, sourceGraph, offsetx, offsety);
    }
  }

  /**
   * Move the content of the source graph into the destination graph.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/AbstractGraphPlacer.java
   */
  protected moveGraph(destGraph: LGraph, sourceGraph: LGraph, offsetx: number, offsety: number): void {
    const graphOffset = sourceGraph.getOffset().add(offsetx, offsety);

    for (const node of sourceGraph.getLayerlessNodes()) {
      node.getPosition().add(graphOffset);
      for (const port of node.getPorts()) {
        for (const edge of port.getOutgoingEdges()) {
          edge.getBendPoints().offset(graphOffset);
          const junctionPoints: KVectorChain | null = edge.getProperty(LayeredOptions.JUNCTION_POINTS);
          if (junctionPoints !== null) {
            junctionPoints.offset(graphOffset);
          }
          for (const label of edge.getLabels()) {
            label.getPosition().add(graphOffset);
          }
        }
      }
      destGraph.getLayerlessNodes().push(node);
      node.setGraph(destGraph);
    }
  }

  /**
   * Offset the content of all graphs by the given values.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/AbstractGraphPlacer.java
   */
  protected offsetGraphs(graphs: Iterable<LGraph>, offsetx: number, offsety: number): void {
    for (const graph of graphs) {
      this.offsetGraph(graph, offsetx, offsety);
    }
  }

  /**
   * Offset the content of the graph by the given values.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/AbstractGraphPlacer.java
   */
  protected offsetGraph(graph: LGraph, offsetx: number, offsety: number): void {
    const graphOffset = new KVector(offsetx, offsety);

    for (const node of graph.getLayerlessNodes()) {
      node.getPosition().add(graphOffset);
      for (const port of node.getPorts()) {
        for (const edge of port.getOutgoingEdges()) {
          edge.getBendPoints().offset(graphOffset);
          const junctionPoints: KVectorChain | null = edge.getProperty(LayeredOptions.JUNCTION_POINTS);
          if (junctionPoints !== null) {
            junctionPoints.offset(graphOffset);
          }
          for (const label of edge.getLabels()) {
            label.getPosition().add(graphOffset);
          }
        }
      }
    }
  }
}
