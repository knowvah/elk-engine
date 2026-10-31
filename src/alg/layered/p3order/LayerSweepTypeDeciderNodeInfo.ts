// SPDX-License-Identifier: EPL-2.0

/**
 * For a single node, collects number of paths to nodes with random or hierarchical nodes. Java's package-private
 * nested `LayerSweepTypeDecider.NodeInfo` (M15 file naming); its fields are package-private there and read by the
 * decider.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/LayerSweepTypeDecider.java:159
 */
export class LayerSweepTypeDeciderNodeInfo {
  connectedEdges = 0;
  hierarchicalInfluence = 0;
  randomInfluence = 0;

  /** @see LayerSweepTypeDecider.java:164 */
  transfer(nodeInfo: LayerSweepTypeDeciderNodeInfo): void {
    this.hierarchicalInfluence += nodeInfo.hierarchicalInfluence;
    this.randomInfluence += nodeInfo.randomInfluence;
    this.connectedEdges += nodeInfo.connectedEdges;
  }

  /** @see LayerSweepTypeDecider.java:171 */
  toString(): string {
    return (
      `NodeInfo [connectedEdges=${String(this.connectedEdges)}, hierarchicalInfluence=` +
      `${String(this.hierarchicalInfluence)}, randomInfluence=${String(this.randomInfluence)}]`
    );
  }
}
