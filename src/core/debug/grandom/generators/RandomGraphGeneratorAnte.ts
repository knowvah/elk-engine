// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../../graph/ElkNode.js';
import type { RandomGraphGenerator } from './RandomGraphGenerator.js';

/** The scalar arguments of Java `generateANTEGraph` (six Java parameters; grouped to respect the 5-parameter limit). */
export interface AnteGraphArgs {
  /** the number of nodes */
  readonly n: number;
  /** the number of edges */
  readonly m: number;
  /** whether the graph is to be planar */
  readonly planar: boolean;
  /** whether the graph has a single source */
  readonly singleSource: boolean;
  /** the current hierarchy level */
  readonly hierarchyLevel: number;
}

/**
 * PLACEHOLDER for Java `generateANTEGraph` (acyclic graph without transitive edges). A later
 * mission task replaces the body; until then the graph type fails loudly.
 *
 * @param gen the generator
 * @param parent the parent node
 * @param args the scalar arguments
 * @internal
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/RandomGraphGenerator.java
 */
export function generateANTEGraph(gen: RandomGraphGenerator, parent: ElkNode, args: AnteGraphArgs): void {
  throw new Error('GRANDOM_PLACEHOLDER: generateANTEGraph is not ported yet');
}
