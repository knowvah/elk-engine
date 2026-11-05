// SPDX-License-Identifier: EPL-2.0
// Proof of ComponentsProcessor and the four placers behind it (mission 7f, T4): the 10 `componentsSplit` and 10
// `componentsCombine` rows of test/golden/refs/java/layered-pipeline.json replayed through `runPipelineSteps` with
// `new ComponentsProcessor()` as the handler, the explicit-stack `dfs` against a verbatim recursive twin (F11), and a
// deep chain. Expectations come only from the rows, the twin and the Java (F16).
import { beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { compareRouting } from '../../../../test/helpers/layered-routing-replay-compare.js';
import {
  comparePipeline,
  pipelineDump,
  runPipelineSteps,
  type ComponentsHandler,
} from '../../../../test/helpers/layered-pipeline-replay-ops.js';
import {
  isComponentsRow,
  isStopRow,
  loadPipelineRows,
  type PipelineStopRow,
} from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import type { Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../core/math/KVector.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { IntermediateProcessorStrategy } from '../intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../p5edges/EdgeRouterFactory.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { ComponentOrderingStrategy } from './ComponentOrderingStrategy.js';
import { ComponentsProcessor } from './ComponentsProcessor.js';

const REF = `${repoRoot()}/test/golden/refs/java/layered-pipeline.json`;
const COMPONENTS_PREFIX = 'scenarios/ComponentsProcessor/';
const COMBINE_SUFFIX = '/combine';
const SPLIT_SUFFIX = '/split';
const TWIN_DEPTH = 200;
const DEEP_CHAIN = 5000;
const ROWS_PER_OP = 10;

const rows = loadPipelineRows(REF)
  .filter(isStopRow)
  .filter((row) => row.id.startsWith(COMPONENTS_PREFIX));
const splitRows = rows.filter((row) => row.id.endsWith(SPLIT_SUFFIX));
const combineRows = rows.filter((row) => row.id.endsWith(COMBINE_SUFFIX));

/** Processors the enum has not wired yet (T6, T7 write the classes; T8 wires the arms) run as a no-op here. */
const passThrough: ILayoutProcessor<LGraph> = { process: () => undefined };

/** The step names a row runs through `runProcessor`. */
const processorsOf = (row: PipelineStopRow): string[] =>
  row.steps!.filter(([op]) => op === 'runProcessor').map(([, name]) => name as string);

const isWired = (name: string): boolean => {
  try {
    IntermediateProcessorStrategy.valueOf(name).create();
    return true;
  } catch (error) {
    if (error instanceof UnsupportedOperationException) {
      return false;
    }
    throw error;
  }
};

/**
 * `HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER` moves the external port dummies of the rows with external ports; a row
 * that runs it cannot replay before its arm is wired (T8), so it is skipped until then. `END_LABEL_SORTER` only orders
 * end labels, which no components row has, so it runs as a no-op meanwhile.
 */
const ROUTER = 'HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER';
const needsPendingRouter = (row: PipelineStopRow): boolean => processorsOf(row).includes(ROUTER) && !isWired(ROUTER);

const factories: Factories = {
  createProcessor: (name) => {
    try {
      return IntermediateProcessorStrategy.valueOf(name).create();
    } catch (error) {
      if (error instanceof UnsupportedOperationException) {
        return passThrough;
      }
      throw error;
    }
  },
  createPhase: (phase, strategy) => {
    switch (phase) {
      case 'P1_CYCLE_BREAKING':
        return CycleBreakingStrategy.valueOf(strategy).create();
      case 'P2_LAYERING':
        return LayeringStrategy.valueOf(strategy).create();
      case 'P3_NODE_ORDERING':
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case 'P4_NODE_PLACEMENT':
        return NodePlacementStrategy.valueOf(strategy).create();
      case 'P5_EDGE_ROUTING':
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

/** The component list of the Java `split` through the Java's own recursive `dfs` (ComponentsProcessor.java:185). */
interface TwinComponent {
  readonly nodes: LNode[];
  readonly sides: EnumSet<PortSide>;
}

function twinDfs(node: LNode, data: TwinComponent | null): TwinComponent | null {
  if (node.id === 0) {
    node.id = 1;
    let mutableData = data;
    if (mutableData === null) {
      mutableData = { nodes: [], sides: EnumSet.noneOf(PortSide) };
    }
    mutableData.nodes.push(node);
    if (node.getType() === NodeType.EXTERNAL_PORT) {
      mutableData.sides.add(node.getProperty(InternalProperties.EXT_PORT_SIDE));
    }
    for (const port1 of node.getPorts()) {
      for (const port2 of port1.getConnectedPorts()) {
        twinDfs(port2.getNode()!, mutableData);
      }
    }
    return mutableData;
  }
  return null;
}

/** LGraphUtil.java:1153 `getMinimalModelOrder` over the nodes of a twin component. */
function minimalModelOrder(component: TwinComponent): number {
  let order = JavaInteger.MAX_VALUE;
  for (const node of component.nodes) {
    if (node.hasProperty(InternalProperties.MODEL_ORDER)) {
      order = Math.min(order, node.getProperty(InternalProperties.MODEL_ORDER));
    }
  }
  return order;
}

function twinComponents(graph: LGraph): TwinComponent[] {
  for (const node of graph.getLayerlessNodes()) {
    node.id = 0;
  }
  const result: TwinComponent[] = [];
  for (const node of graph.getLayerlessNodes()) {
    const componentData = twinDfs(node, null);
    if (componentData !== null) {
      result.push(componentData);
    }
  }
  // ComponentsProcessor.java:100-106 sorts by the minimal model order unless CONSIDER_MODEL_ORDER_COMPONENTS is NONE
  if (graph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_COMPONENTS) !== ComponentOrderingStrategy.NONE) {
    result.sort((c1, c2) => Math.sign(minimalModelOrder(c1) - minimalModelOrder(c2)));
  }
  return result;
}

/** A component as the list of node positions in the graph's layerless list before the split, and its side names. */
const describeComponent = (nodes: readonly LNode[], sides: Iterable<PortSide>, order: readonly LNode[]): unknown => ({
  nodes: nodes.map((node) => order.indexOf(node)),
  sides: Array.from(sides, (side) => side.name()),
});

/** A handler that runs the twin on the graph before the real split and returns what each produced. */
function twinHandler(processor: ComponentsProcessor, seen: { twin: unknown; actual: unknown }): ComponentsHandler {
  return {
    split: (graph) => {
      const order = graph.getLayerlessNodes().slice();
      seen.twin = twinComponents(graph).map((c) => describeComponent(c.nodes, c.sides, order));
      const result = processor.split(graph);
      seen.actual = result.map((c) =>
        describeComponent(c.getLayerlessNodes(), c.getProperty(InternalProperties.EXT_PORT_CONNECTIONS), order),
      );
      return result;
    },
    combine: (components, target) => {
      processor.combine([...components], target);
    },
  };
}

function replay(row: PipelineStopRow, handler: ComponentsHandler): ReturnType<typeof runPipelineSteps> {
  return runPipelineSteps(row, factories, handler);
}

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('ComponentsProcessor rows', () => {
  it('finds the 10 split and 10 combine rows of the ref', () => {
    expect([splitRows.length, combineRows.length]).toEqual([ROWS_PER_OP, ROWS_PER_OP]);
  });

  it.each(splitRows.map((row) => [row.id, row] as const))('%s: the component list equals the row', (_id, row) => {
    const processor = new ComponentsProcessor();
    const result = replay(row, {
      split: (graph) => processor.split(graph),
      combine: (components, target) => {
        processor.combine([...components], target);
      },
    });
    expect(isComponentsRow(row)).toBe(true);
    expect(comparePipeline(pipelineDump(result), row.expected)).toEqual([]);
  });

  for (const row of combineRows) {
    it.skipIf(needsPendingRouter(row))(`${row.id}: the combined graph equals the row`, () => {
      const processor = new ComponentsProcessor();
      const actual = pipelineDump(
        replay(row, {
          split: (graph) => processor.split(graph),
          combine: (components, target) => {
            processor.combine([...components], target);
          },
        }),
      );
      if ('components' in actual || 'components' in row.expected) {
        throw new Error(`row ${row.id} must dump a target, not a component list`);
      }
      expect(compareRouting(actual, row.expected)).toEqual([]);
    });
  }

  it.each(rows.map((row) => [row.id, row] as const))('%s: the dfs equals the recursive twin', (_id, row) => {
    const seen = { twin: null as unknown, actual: null as unknown };
    replay(row, twinHandler(new ComponentsProcessor(), seen));
    expect(seen.actual).toEqual(seen.twin);
  });
});

function chain(length: number): LGraph {
  const graph = new LGraph();
  let previous = addPort(addNode(graph));
  for (let i = 1; i < length; i++) {
    const node = addNode(graph);
    connect(previous, addPort(node));
    previous = addPort(node);
  }
  return graph;
}

describe('ComponentsProcessor.dfs on a chain', () => {
  it(`visits a chain of ${String(TWIN_DEPTH)} nodes in the order of the recursive twin`, () => {
    const graph = chain(TWIN_DEPTH);
    const nodes = graph.getLayerlessNodes().slice();
    const twin = twinComponents(graph);
    const [component, ...rest] = new ComponentsProcessor().split(graph);
    expect(rest).toEqual([]);
    expect(component!.getLayerlessNodes()).toEqual(twin[0]!.nodes);
    expect(component!.getLayerlessNodes()).toEqual(nodes);
  });

  it(`splits a chain of ${String(DEEP_CHAIN)} nodes into one component without overflow`, () => {
    const graph = chain(DEEP_CHAIN);
    const nodes = graph.getLayerlessNodes().slice();
    const result = new ComponentsProcessor().split(graph);
    expect(result).toHaveLength(1);
    expect(result[0]!.getLayerlessNodes()).toEqual(nodes);
  });

  it('keeps unconnected nodes in components of their own, in node order', () => {
    const graph = new LGraph();
    const nodes = [addNode(graph), addNode(graph), addNode(graph)];
    const result = new ComponentsProcessor().split(graph);
    expect(result.map((component) => component.getLayerlessNodes())).toEqual(nodes.map((node) => [node]));
  });
});

/** A graph of `count` unconnected nodes with the options of a components scenario. */
function separable(count: number, options: (graph: LGraph) => void = () => undefined): LGraph {
  const graph = new LGraph();
  for (let i = 0; i < count; i++) {
    addNode(graph);
  }
  options(graph);
  return graph;
}

const withExternalPorts = (graph: LGraph): void => {
  graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.of(GraphProperties.EXTERNAL_PORTS));
};

describe('ComponentsProcessor.split', () => {
  it('returns the graph as the only component when separation is switched off', () => {
    const graph = separable(2, (g) => g.setProperty(LayeredOptions.SEPARATE_CONNECTED_COMPONENTS, false));
    expect(new ComponentsProcessor().split(graph)).toEqual([graph]);
  });

  it('returns the graph as the only component when its external ports have a fixed order', () => {
    const graph = separable(2, (g) => {
      withExternalPorts(g);
      g.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    });
    expect(new ComponentsProcessor().split(graph)).toEqual([graph]);
  });

  it('removes the minimum size from the components and copies the padding', () => {
    const graph = separable(2, (g) => {
      g.setProperty(LayeredOptions.NODE_SIZE_MINIMUM, new KVector(5, 6));
      g.getPadding().left = 7;
    });
    const [first] = new ComponentsProcessor().split(graph);
    expect(first!.hasProperty(LayeredOptions.NODE_SIZE_MINIMUM)).toBe(false);
    expect(first!.getPadding().left).toBe(graph.getPadding().left);
  });

  it('combines no components into an empty target (size 0, 0) with every placer', () => {
    const none: LGraph[] = [];
    for (const setUp of [
      () => undefined,
      withExternalPorts,
      (g: LGraph) => {
        withExternalPorts(g);
        g.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_COMPONENTS, ComponentOrderingStrategy.MODEL_ORDER);
      },
      (g: LGraph) => {
        withExternalPorts(g);
        g.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_COMPONENTS, ComponentOrderingStrategy.GROUP_MODEL_ORDER);
      },
    ]) {
      const graph = separable(1, setUp);
      const processor = new ComponentsProcessor();
      processor.split(graph);
      const target = new LGraph();
      target.getSize().x = 3;
      processor.combine(none, target);
      expect([target.getSize().x, target.getSize().y]).toEqual([0, 0]);
    }
  });

  it('moves the nodes of the only component into a different target', () => {
    const graph = separable(1);
    const processor = new ComponentsProcessor();
    const components = processor.split(graph);
    const target = new LGraph();
    processor.combine(components, target);
    expect(target.getLayerlessNodes()).toEqual(components[0]!.getLayerlessNodes());
  });

  it('throws the staged compactor error naming 7g when compaction of connected components is on', () => {
    const compacting = (g: LGraph): void => {
      g.setProperty(LayeredOptions.COMPACTION_CONNECTED_COMPONENTS, true);
      g.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.ORTHOGONAL);
    };
    for (const setUp of [
      compacting,
      (g: LGraph) => {
        compacting(g);
        withExternalPorts(g);
      },
      (g: LGraph) => {
        compacting(g);
        withExternalPorts(g);
        g.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_COMPONENTS, ComponentOrderingStrategy.GROUP_MODEL_ORDER);
      },
    ]) {
      const processor = new ComponentsProcessor();
      const components = processor.split(separable(2, setUp));
      expect(() => {
        processor.combine(components, new LGraph());
      }).toThrow(/7g/);
    }
  });

  it('refuses to combine before a split', () => {
    expect(() => {
      new ComponentsProcessor().combine([], new LGraph());
    }).toThrow(TypeError);
  });
});
