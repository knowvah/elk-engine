// SPDX-License-Identifier: EPL-2.0
import { Direction } from '../../../core/options/Direction.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import * as DoubleToString from '../../../java/lang/DoubleToString.js';
import * as Int32 from '../../../java/lang/Int32.js';
import { LinkedList } from '../../../java/util/LinkedList.js';
import { NEdge } from './NEdge.js';
import { NNode } from './NNode.js';

/**
 * A graph handed to the network simplex algorithm: a list of nodes whose edges hang off the nodes.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/networksimplex/NGraph.java
 */
export class NGraph {
  nodes: NNode[] = [];

  /**
   * Builds the debug graph of this network. AC4: the Java then saves it through an EMF `Resource` to `filePath`; this
   * port keeps the construction and writes nothing (no file output in a browser build), so `filePath` is unused.
   */
  writeDebugGraph(_filePath: string): void {
    const elkGraph = ElkGraphUtil.createGraph();
    elkGraph.setProperty(CoreOptions.DIRECTION, Direction.DOWN);
    // AD-10 (I38): Java `Maps.newHashMap()` keyed by identity; TS `Map` in insertion order. Lookup only.
    const nodeMap = new Map<NNode, ElkNode>();

    for (const nNode of this.nodes) {
      const elkNode = ElkGraphUtil.createNode(elkGraph);
      nodeMap.set(nNode, elkNode);

      ElkGraphUtil.createLabelWithText(`${nNode.type} ${nNode.layer}`, elkNode);
    }

    for (const nNode of this.nodes) {
      for (const nEdge of nNode.getOutgoingEdges()) {
        const elkEdge = ElkGraphUtil.createSimpleEdge(
          nodeMap.get(nEdge.source as NNode) ?? null,
          nodeMap.get(nEdge.target as NNode) ?? null,
        );
        ElkGraphUtil.createLabelWithText(`${DoubleToString.toString(nEdge.weight)} ${nEdge.delta}`, elkEdge);
      }
    }

    // ResourceSet rs = new ResourceSetImpl();
    // Resource r = rs.createResource(URI.createFileURI(filePath));
    // r.getContents().add(elkGraph);
    // try { r.save(Collections.emptyMap()); } catch (IOException e) { e.printStackTrace(); }
  }

  /**
   * Ensures the graph is connected by adding an artificial root with zero-weight, zero-delta edges to one node of each
   * connected component; returns the root, or `null` if the graph was connected already.
   */
  makeConnected(): NNode | null {
    let id = 0;
    for (const n of this.nodes) {
      n.internalId = id++;
    }
    const ccRep = this.#findConCompRepresentatives();
    let root: NNode | null = null;
    if (ccRep.length > 1) {
      root = this.#createArtificialRootAndConnect(ccRep);
    }
    return root;
  }

  #createArtificialRootAndConnect(nodesToConnect: NNode[]): NNode {
    const root = NNode.of().create(this);
    for (const src of nodesToConnect) {
      NEdge.of().delta(0).weight(0).source(root).target(src).create();
    }
    return root;
  }

  #findConCompRepresentatives(): NNode[] {
    const ccRep: NNode[] = [];
    const mark: boolean[] = new Array<boolean>(this.nodes.length).fill(false);
    for (const node of this.nodes) {
      if (!mark[node.internalId]) {
        ccRep.push(node);
        this.#dfs(node, mark);
      }
    }
    return ccRep;
  }

  #dfs(node: NNode, mark: boolean[]): void {
    if (mark[node.internalId]) {
      return;
    }
    mark[node.internalId] = true;
    for (const edge of node.getConnectedEdges()) {
      const other = edge.getOther(node) as NNode;
      this.#dfs(other, mark);
    }
  }

  /** Whether the graph has no cycles (checked by layering a topological sweep and looking for backward edges). */
  isAcyclic(): boolean {
    let id = 0;
    for (const n of this.nodes) {
      n.internalId = id++;
    }

    // initialize the number of incident edges for each node
    const incident = new Int32Array(this.nodes.length);
    const layer = new Int32Array(this.nodes.length);
    for (const node of this.nodes) {
      incident[node.internalId] = Int32.add(incident[node.internalId] as number, node.getIncomingEdges().size());
    }

    const roots = new LinkedList<NNode>();
    for (const node of this.nodes) {
      if (node.getIncomingEdges().isEmpty()) {
        roots.add(node);
      }
    }
    if (roots.isEmpty() && this.nodes.length !== 0) {
      return false;
    }
    NGraph.#assignLayers(roots, incident, layer);

    // check for backward edges
    return !this.#hasBackwardEdge(layer);
  }

  // Split from `isAcyclic` (complexity limits): the Java `while (!roots.isEmpty())` sweep.
  static #assignLayers(roots: LinkedList<NNode>, incident: Int32Array, layer: Int32Array): void {
    while (!roots.isEmpty()) {
      const node = roots.removeFirst();

      for (const edge of node.getOutgoingEdges()) {
        const target = edge.getTarget() as NNode;
        layer[target.internalId] = Math.max(
          layer[target.internalId] as number,
          Int32.add(layer[node.internalId] as number, 1),
        );
        incident[target.internalId] = Int32.sub(incident[target.internalId] as number, 1);
        if (incident[target.internalId] === 0) {
          roots.add(target);
        }
      }
    }
  }

  // Split from `isAcyclic` (complexity limits): the Java "check for backward edges" loop.
  #hasBackwardEdge(layer: Int32Array): boolean {
    for (const node of this.nodes) {
      for (const edge of node.getOutgoingEdges()) {
        const source = edge.source as NNode;
        const target = edge.target as NNode;
        if ((layer[target.internalId] as number) <= (layer[source.internalId] as number)) {
          return true;
        }
      }
    }
    return false;
  }
}
