// SPDX-License-Identifier: EPL-2.0
import { PortConstraints } from '../../../../core/options/PortConstraints.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { IndividualSpacings } from '../../../../core/util/IndividualSpacings.js';
import { IndexOutOfBoundsException } from '../../../../java/lang/IndexOutOfBoundsException.js';
import * as Int32 from '../../../../java/lang/Int32.js';
import { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import { LNode } from '../../graph/LNode.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { LPort } from '../../graph/LPort.js';
import type { Layer } from '../../graph/Layer.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';

/**
 * Utility methods for cut index calculations used by more than one heuristic.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/CuttingUtils.java
 */
export class CuttingUtils {
  private constructor() {}

  /**
   * Inserts two in-layer dummies and a varying number of long edge dummies for the passed edge.
   *
   * Let `originalEdge = e = (u,v)`. In-layer dummies `il_1` and `il_2` are inserted into layers `L(u)` and `L(v)`. Long
   * edge dummies `d_1, ..., d_m` are inserted into the layers `L(u)+1, ..., L(v)-1`.
   *
   * The resulting chain of edges looks as follows (if `offsetFirstInLayerDummy` is 1).
   *
   * ```
   *                               v
   *                               ^
   * il_1 -> d_1 -> ... -> d_m -> il_2
   *  ^
   *  u
   * ```
   *
   * The Java prologue and loop body are split into `createSpacings`, `createDummyNode` and `createDummyPorts` (complexity limits); statement order is
   * the Java's.
   *
   * @param layeredGraph the underlying graph with a given layering.
   * @param originalEdge the edge to be split
   * @param offsetFirstInLayerDummy the dummy nodes are inserted at the end of each layer. For the first in-layer dummy
   *   this is not always desired and can be modified using this offset.
   */
  static insertDummies(layeredGraph: LGraph, originalEdge: LEdge, offsetFirstInLayerDummy: number): LEdge[] {
    const is = CuttingUtils.#createSpacings(layeredGraph);

    let edge = originalEdge;
    const targetPort = edge.getTarget();
    const src = edge.getSource()!.getNode()!;
    const tgt = edge.getTarget()!.getNode()!;

    const srcIndex = src.getLayer()!.getIndex();
    const tgtIndex = tgt.getLayer()!.getIndex();

    const createdEdges: LEdge[] = [];

    // plain number loop counter: srcIndex..tgtIndex are layer indexes
    for (let i = srcIndex; i <= tgtIndex; i++) {
      // Create dummy node
      const dummyNode = CuttingUtils.#createDummyNode(layeredGraph, edge, is);

      const nextLayer = CuttingUtils.#layerAt(layeredGraph, i);
      if (i === srcIndex) {
        dummyNode.setLayer(Int32.sub(nextLayer.getNodes().length, offsetFirstInLayerDummy), nextLayer);
      } else {
        dummyNode.setLayer(nextLayer);
      }

      const { dummyInput, dummyOutput } = CuttingUtils.#createDummyPorts(dummyNode, edge);

      edge.setTarget(dummyInput);

      // Create a dummy edge
      const dummyEdge = new LEdge();
      dummyEdge.copyProperties(edge);
      dummyEdge.setProperty(LayeredOptions.JUNCTION_POINTS, null);
      dummyEdge.setSource(dummyOutput);
      dummyEdge.setTarget(targetPort);

      CuttingUtils.#setDummyProperties(dummyNode, edge, dummyEdge);
      createdEdges.push(dummyEdge);
      edge = dummyEdge;
    }

    return createdEdges;
  }

  /** The Java prologue: individual spacings that visually separate the backward wrapping edges. */
  static #createSpacings(layeredGraph: LGraph): IndividualSpacings {
    // to visually separate the backward wrapping edges, add some additional spacing
    const edgeNodeSpacing = layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_NODE);
    const additionalSpacing = layeredGraph.getProperty(LayeredOptions.WRAPPING_ADDITIONAL_EDGE_SPACING);
    const is = new IndividualSpacings();
    is.setProperty(LayeredOptions.SPACING_EDGE_NODE, edgeNodeSpacing + additionalSpacing);
    return is;
  }

  /** Java `layeredGraph.getLayers().get(i)`: an index outside the list throws. */
  static #layerAt(layeredGraph: LGraph, i: number): Layer {
    const layers = layeredGraph.getLayers();
    if (i < 0 || i >= layers.length) {
      throw new IndexOutOfBoundsException(`Index ${i} out of bounds for length ${layers.length}`);
    }
    return layers[i]!;
  }

  /** The first statements of the Java loop body: a long edge dummy that carries the edge as origin. */
  static #createDummyNode(layeredGraph: LGraph, edge: LEdge, is: IndividualSpacings): LNode {
    const dummyNode = new LNode(layeredGraph);
    dummyNode.setType(NodeType.LONG_EDGE);
    dummyNode.setProperty(InternalProperties.ORIGIN, edge);
    dummyNode.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    dummyNode.setProperty(LayeredOptions.SPACING_INDIVIDUAL, is);
    return dummyNode;
  }

  /**
   * The thickness and port statements of the Java loop body. Returns the two ports it creates.
   */
  static #createDummyPorts(dummyNode: LNode, edge: LEdge): { dummyInput: LPort; dummyOutput: LPort } {
    // Set thickness of the edge
    let thickness = edge.getProperty(LayeredOptions.EDGE_THICKNESS);
    if (thickness < 0) {
      thickness = 0;
      edge.setProperty(LayeredOptions.EDGE_THICKNESS, thickness);
    }
    dummyNode.getSize().y = thickness;
    const portPos = Math.floor(thickness / 2);

    // Create dummy input and output ports
    const dummyInput = new LPort();
    dummyInput.setSide(PortSide.WEST);
    dummyInput.setNode(dummyNode);
    dummyInput.getPosition().y = portPos;

    const dummyOutput = new LPort();
    dummyOutput.setSide(PortSide.EAST);
    dummyOutput.setNode(dummyNode);
    dummyOutput.getPosition().y = portPos;

    return { dummyInput, dummyOutput };
  }

  /**
   * Copied from `LongEdgeSplitter`.
   *
   * Sets the source and target properties on the given dummy node.
   *
   * @param dummy the dummy node.
   * @param inEdge the edge going into the dummy node.
   * @param outEdge the edge going out of the dummy node.
   */
  static #setDummyProperties(dummy: LNode, inEdge: LEdge, outEdge: LEdge): void {
    const inEdgeSourceNode = inEdge.getSource()!.getNode()!;

    if (inEdgeSourceNode.getType() === NodeType.LONG_EDGE) {
      // The incoming edge originates from a long edge dummy node, so we can
      // just copy its properties
      dummy.setProperty(
        InternalProperties.LONG_EDGE_SOURCE,
        inEdgeSourceNode.getProperty(InternalProperties.LONG_EDGE_SOURCE),
      );
      dummy.setProperty(
        InternalProperties.LONG_EDGE_TARGET,
        inEdgeSourceNode.getProperty(InternalProperties.LONG_EDGE_TARGET),
      );
    } else {
      // The source is the input edge's source port, the target is the output
      // edge's target port
      dummy.setProperty(InternalProperties.LONG_EDGE_SOURCE, inEdge.getSource());
      dummy.setProperty(InternalProperties.LONG_EDGE_TARGET, outEdge.getTarget());
    }
  }
}
