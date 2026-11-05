// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../core/util/Pair.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { AbstractGraphPlacer } from './AbstractGraphPlacer.js';
import { ComponentGroupGraphPlacer } from './ComponentGroupGraphPlacer.js';
import { ComponentGroupModelOrderGraphPlacer } from './ComponentGroupModelOrderGraphPlacer.js';
import { ComponentOrderingStrategy } from './ComponentOrderingStrategy.js';
import { ModelOrderRowGraphPlacer } from './ModelOrderRowGraphPlacer.js';
import { SimpleRowGraphPlacer } from './SimpleRowGraphPlacer.js';

/** The nodes of one connected component and the external port sides they connect to. */
type ComponentData = Pair<LNode[], EnumSet<PortSide>>;

/** Java `Integer.compare`. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/**
 * The connected ports of every port of a node, lazily in the order of the Java nested loops
 * `for (port1 : node.getPorts()) for (port2 : port1.getConnectedPorts())`.
 */
function* connectedPortsOf(node: LNode): Generator<LPort> {
  for (const port1 of node.getPorts()) {
    yield* port1.getConnectedPorts();
  }
}

/**
 * Splits a graph into its connected components and puts the laid out components back together. The
 * connected-components DFS of Java's `dfs` is a loop over an explicit stack of lazy port iterators here (F11), so it
 * has no depth limit.
 *
 * @author msp
 * @author cds
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsProcessor.java
 */
export class ComponentsProcessor {
  private readonly componentGroupGraphPlacer = new ComponentGroupGraphPlacer();
  private readonly componentGroupModelOrderGraphPlacer = new ComponentGroupModelOrderGraphPlacer();
  private readonly modelOrderRowGraphPlacer = new ModelOrderRowGraphPlacer();
  private readonly simpleRowGraphPlacer = new SimpleRowGraphPlacer();
  private graphPlacer: AbstractGraphPlacer | null = null;

  /**
   * Split the given graph into its connected components, if possible. The graph is returned as the only component if
   * it cannot be split.
   *
   * @param graph the graph to split
   * @return a list of components
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsProcessor.java:91
   */
  split(graph: LGraph): LGraph[] {
    let result: LGraph[];

    // Default to the simple graph placer
    this.graphPlacer = this.simpleRowGraphPlacer;

    // Whether separate components processing is requested. The Java reads a nullable Boolean; the property has the
    // default true and a null value is removed on set, so the null test is kept for the contract only.
    const separateProperty: boolean | null = graph.getProperty(LayeredOptions.SEPARATE_CONNECTED_COMPONENTS);
    const separate = separateProperty === null || separateProperty;

    // Whether the graph contains external ports
    const extPorts = graph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS);

    // The graph's external port constraints
    const extPortConstraints: PortConstraints = graph.getProperty(LayeredOptions.PORT_CONSTRAINTS);
    const compatiblePortConstraints = !extPortConstraints.isOrderFixed();

    // The graph may only be separated
    //  1. Separation was requested.
    //  2. If the graph contains external ports, port constraints are set to either
    //     FREE or FIXED_SIDES.
    if (separate && (compatiblePortConstraints || !extPorts)) {
      result = this.splitIntoComponents(graph);

      if (extPorts) {
        this.chooseComponentGroupPlacer(graph);
      }
    } else {
      result = [graph];
    }
    // If model order should be preserved the connected components should be ordered by their elements.
    // The component with the node with the smallest order should be first.
    if (graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_COMPONENTS) !== ComponentOrderingStrategy.NONE) {
      result.sort((g1, g2) => {
        const g1Order = LGraphUtil.getMinimalModelOrder(g1);
        const g2Order = LGraphUtil.getMinimalModelOrder(g2);
        return integerCompare(g1Order, g2Order);
      });
    }

    return result;
  }

  /**
   * The external port branch of `split` (split out for the complexity limits). With external port connections, we want
   * to use the more complex components placement algorithm.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsProcessor.java:146
   */
  private chooseComponentGroupPlacer(graph: LGraph): void {
    const ordering = graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_COMPONENTS);
    if (ordering === ComponentOrderingStrategy.GROUP_MODEL_ORDER) {
      this.graphPlacer = this.componentGroupModelOrderGraphPlacer;
    } else if (ordering === ComponentOrderingStrategy.MODEL_ORDER) {
      this.graphPlacer = this.modelOrderRowGraphPlacer;
    } else {
      this.graphPlacer = this.componentGroupGraphPlacer;
    }
  }

  /**
   * The component search of `split`: a graph per connected component (split out for the complexity limits; Java order
   * kept).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsProcessor.java:116
   */
  private splitIntoComponents(graph: LGraph): LGraph[] {
    // Set id of all nodes to 0
    for (const node of graph.getLayerlessNodes()) {
      node.id = 0;
    }

    // Perform DFS starting on each node, collecting connected components
    const result: LGraph[] = [];
    for (const node of graph.getLayerlessNodes()) {
      const componentData = this.dfs(node, null);

      if (componentData !== null) {
        const newGraph = new LGraph();

        newGraph.copyProperties(graph);
        newGraph.setProperty(InternalProperties.EXT_PORT_CONNECTIONS, componentData.getSecond());
        newGraph.getPadding().copy(graph.getPadding());

        // If a minimum size was set on the original graph, setting it on the seperated graphs as well
        // might enlarge them although their combined area might not actually have fallen below the minimum
        // size; thus, remove the minimum size
        newGraph.setProperty(LayeredOptions.NODE_SIZE_MINIMUM, null);

        for (const n of componentData.getFirst()!) {
          newGraph.getLayerlessNodes().push(n);
          n.setGraph(newGraph);
        }

        result.push(newGraph);
      }
    }
    return result;
  }

  /**
   * Perform a DFS on the given node, collecting all nodes of its connected component. Java recurses over the connected
   * ports; this loop keeps one lazy iterator per recursion level, so the visit order, the marks and the accumulation
   * into the shared data are those of the recursion.
   *
   * @param node a node
   * @param data pair of the list of nodes in the component and the set of external port sides, or `null`
   * @return the data of the component, or `null` if the node was already visited
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsProcessor.java:185
   */
  private dfs(node: LNode, data: ComponentData | null): ComponentData | null {
    if (node.id !== 0) {
      // The node was already visited
      return null;
    }

    // Check if we already have a list of nodes for the connected component
    const mutableData: ComponentData = data ?? new Pair<LNode[], EnumSet<PortSide>>([], EnumSet.noneOf(PortSide));
    const stack: Generator<LPort>[] = [ComponentsProcessor.enter(node, mutableData)];

    // DFS
    while (stack.length > 0) {
      const next = stack[stack.length - 1]!.next();
      if (next.done === true) {
        stack.pop();
      } else {
        const port2Node = next.value.getNode()!;
        if (port2Node.id === 0) {
          stack.push(ComponentsProcessor.enter(port2Node, mutableData));
        }
      }
    }

    return mutableData;
  }

  /**
   * The part of Java's `dfs` before the loops, for an unvisited node: marks the node as visited, adds it to the
   * component and records its external port side. Returns the lazy connected ports of the node.
   */
  private static enter(node: LNode, mutableData: ComponentData): Generator<LPort> {
    // Mark the node as visited
    node.id = 1;

    // Add this node to the component
    mutableData.getFirst()!.push(node);

    // Check if this node is an external port dummy and, if so, add its side
    if (node.getType() === NodeType.EXTERNAL_PORT) {
      mutableData.getSecond()!.add(node.getProperty(InternalProperties.EXT_PORT_SIDE));
    }

    return connectedPortsOf(node);
  }

  /**
   * Combine the given list of components into the target graph, using the placer chosen by the last `split`.
   *
   * @param components list of components
   * @param target the target graph
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsProcessor.java:230
   */
  combine(components: LGraph[], target: LGraph): void {
    if (this.graphPlacer === null) {
      // Java's NullPointerException on the unset placer is a TypeError here (D10)
      throw new TypeError('combine was called before split');
    }
    this.graphPlacer.combine(components, target);
  }
}
