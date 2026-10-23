// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import type { Random } from '../../../../java/util/Random.js';
import { PortConstraints } from '../../../options/PortConstraints.js';
import type { Configuration } from '../gRandom/Configuration.js';
import { ConstraintType } from '../gRandom/ConstraintType.js';
import type { DoubleQuantity } from '../gRandom/DoubleQuantity.js';
import { FlowType } from '../gRandom/FlowType.js';
import { Form } from '../gRandom/Form.js';
import type { Nodes } from '../gRandom/Nodes.js';
import { Side } from '../gRandom/Side.js';
import { EdgeDetermination } from './EdgeDetermination.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { GraphType } from './GraphType.js';
import { RandVal } from './RandVal.js';

/**
 * Java auto-unboxes `Double`/`Integer` getters (`quant.getMin().doubleValue()`); a `null` is a
 * `NullPointerException`, which is a `TypeError` here (translation rules, D10).
 */
function unbox(value: number | null): number {
  if (value === null) {
    throw new TypeError('Cannot unbox a null Double');
  }
  return value;
}

/**
 * Xtend `switch (type) { case INCOMING: switch (side) {...} ... }` as two side-to-property tables
 * (the nested switch would exceed the cyclomatic-complexity limit); a type or side outside the
 * tables sets nothing, exactly like the compiled `default: break`.
 */
const INCOMING_SIDES: ReadonlyMap<Side, IProperty<number>> = new Map([
  [Side.EAST, GeneratorOptions.INCOMING_EAST_SIDE],
  [Side.NORTH, GeneratorOptions.INCOMING_NORTH_SIDE],
  [Side.SOUTH, GeneratorOptions.INCOMING_SOUTH_SIDE],
  [Side.WEST, GeneratorOptions.INCOMING_WEST_SIDE],
]);
const OUTGOING_SIDES: ReadonlyMap<Side, IProperty<number>> = new Map([
  [Side.EAST, GeneratorOptions.OUTGOING_EAST_SIDE],
  [Side.NORTH, GeneratorOptions.OUTGOING_NORTH_SIDE],
  [Side.SOUTH, GeneratorOptions.OUTGOING_SOUTH_SIDE],
  [Side.WEST, GeneratorOptions.OUTGOING_WEST_SIDE],
]);

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function exists(o: unknown): boolean {
  return o !== null;
}

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function setIfExists<T>(genOpt: GeneratorOptions, value: T | null, property: IProperty<T>): boolean {
  if (exists(value)) {
    genOpt.setProperty(property, value);
    return true;
  }
  return false;
}

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function toRandVal(quant: DoubleQuantity): RandVal {
  if (quant.isMinMax()) {
    return RandVal.minMax(unbox(quant.getMin()), unbox(quant.getMax()));
  } else if (quant.isGaussian()) {
    return RandVal.gaussian(unbox(quant.getMean()), unbox(quant.getStddv()));
  }
  return RandVal.exact(unbox(quant.getQuant()));
}

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function setQuantities(genOpt: GeneratorOptions, quant: DoubleQuantity | null, randomValue: IProperty<RandVal>): void {
  if (quant !== null) {
    genOpt.setProperty(randomValue, toRandVal(quant));
  }
}

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function setFlowSide(
  options: GeneratorOptions,
  type: FlowType,
  side: Side,
  quant: DoubleQuantity | null,
  r: Random,
): void {
  if (quant === null) {
    throw new TypeError('Cannot read the amount of a flow without one');
  }
  const amount = toRandVal(quant).intVal(r);
  let sides: ReadonlyMap<Side, IProperty<number>> | undefined;
  if (type === FlowType.INCOMING) {
    sides = INCOMING_SIDES;
  } else if (type === FlowType.OUTGOING) {
    sides = OUTGOING_SIDES;
  }
  const property = sides?.get(side);
  if (property !== undefined) {
    options.setProperty(property, amount);
  }
}

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function getConstraint(constraint: ConstraintType): PortConstraints {
  switch (constraint) {
    case ConstraintType.FREE:
      return PortConstraints.FREE;
    case ConstraintType.ORDER:
      return PortConstraints.FIXED_ORDER;
    case ConstraintType.POSITION:
      return PortConstraints.FIXED_POS;
    case ConstraintType.SIDE:
      return PortConstraints.FIXED_SIDE;
    case ConstraintType.RATIO:
      return PortConstraints.FIXED_RATIO;
    default:
      return PortConstraints.UNDEFINED;
  }
}

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function setGraphType(configuration: Configuration, options: GeneratorOptions): void {
  switch (configuration.getForm()) {
    case Form.ACYCLIC:
      options.setProperty(GeneratorOptions.GRAPH_TYPE, GraphType.ACYCLIC_NO_TRANSITIVE_EDGES);
      break;
    case Form.BICONNECTED:
      options.setProperty(GeneratorOptions.GRAPH_TYPE, GraphType.BICONNECTED);
      break;
    case Form.BIPARTITE:
      options.setProperty(GeneratorOptions.GRAPH_TYPE, GraphType.BIPARTITE);
      break;
    case Form.CUSTOM:
      options.setProperty(GeneratorOptions.GRAPH_TYPE, GraphType.CUSTOM);
      break;
    case Form.TREES:
      options.setProperty(GeneratorOptions.GRAPH_TYPE, GraphType.TREE);
      break;
    case Form.TRICONNECTED:
      options.setProperty(GeneratorOptions.GRAPH_TYPE, GraphType.TRICONNECTED);
      break;
    default:
      break;
  }
}

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function hierarchy(configuration: Configuration, options: GeneratorOptions): void {
  const hierarchy = configuration.getHierarchy();
  if (hierarchy !== null) {
    const hierarch = hierarchy.getNumHierarchNodes();
    setQuantities(options, hierarchy.getCrossHierarchRel(), GeneratorOptions.EXACT_RELATIVE_HIER);
    options.setProperty(GeneratorOptions.SMALL_HIERARCHY, exists(hierarch));
    setQuantities(options, hierarchy.getLevels(), GeneratorOptions.MAX_HIERARCHY_LEVEL);
    setQuantities(options, hierarch, GeneratorOptions.NUMBER_HIERARCHICAL_NODES);
    setQuantities(options, hierarchy.getEdges(), GeneratorOptions.CROSS_HIER);
  }
}

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function edges(config: Configuration, genOpt: GeneratorOptions): void {
  const edges = config.getEdges();
  if (edges !== null) {
    if (edges.isTotal()) {
      genOpt.setProperty(GeneratorOptions.EDGE_DETERMINATION, EdgeDetermination.ABSOLUTE);
      setQuantities(genOpt, edges.getNEdges(), GeneratorOptions.EDGES_ABSOLUTE);
    } else if (edges.isDensity()) {
      setQuantities(genOpt, edges.getNEdges(), GeneratorOptions.DENSITY);
      genOpt.setProperty(GeneratorOptions.EDGE_DETERMINATION, EdgeDetermination.DENSITY);
    } else if (edges.isRelative()) {
      genOpt.setProperty(GeneratorOptions.EDGE_DETERMINATION, EdgeDetermination.RELATIVE);
      setQuantities(genOpt, edges.getNEdges(), GeneratorOptions.RELATIVE_EDGES);
    } else {
      genOpt.setProperty(GeneratorOptions.EDGE_DETERMINATION, EdgeDetermination.OUTGOING);
      setQuantities(genOpt, edges.getNEdges(), GeneratorOptions.OUTGOING_EDGES);
    }
    genOpt.setProperty(GeneratorOptions.EDGE_LABELS, edges.isLabels());
    genOpt.setProperty(GeneratorOptions.SELF_LOOPS, edges.isSelfLoops());
  }
}

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function size(nodes: Nodes, genOpt: GeneratorOptions): void {
  const size = nodes.getSize();
  if (size !== null) {
    setQuantities(genOpt, size.getWidth(), GeneratorOptions.NODE_WIDTH);
    setQuantities(genOpt, size.getHeight(), GeneratorOptions.NODE_HEIGHT);
  }
}

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function ports(nodes: Nodes, genOpt: GeneratorOptions, r: Random): void {
  const ports = nodes.getPorts();
  if (ports !== null) {
    genOpt.setProperty(GeneratorOptions.ENABLE_PORTS, true);
    genOpt.setProperty(GeneratorOptions.CREATE_PORT_LABELS, ports.isLabels());
    genOpt.setProperty(GeneratorOptions.PORT_CONSTRAINTS, getConstraint(ports.getConstraint()));
    setQuantities(genOpt, ports.getReUse(), GeneratorOptions.USE_EXISTING_PORTS_CHANCE);
    for (const f of ports.getFlow()) {
      setFlowSide(genOpt, f.getFlowType(), f.getSide(), f.getAmount(), r);
    }
    const size = ports.getSize();
    genOpt.setProperty(GeneratorOptions.SET_PORT_SIZE, true);
    if (size !== null) {
      setQuantities(genOpt, size.getHeight(), GeneratorOptions.PORT_HEIGHT);
      setQuantities(genOpt, size.getWidth(), GeneratorOptions.PORT_WIDTH);
    }
  }
}

/** @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend */
function nodes(nodes: Nodes | null, r: Random, genOpt: GeneratorOptions): void {
  if (nodes !== null) {
    setQuantities(genOpt, nodes.getNNodes(), GeneratorOptions.NUMBER_OF_NODES);
    genOpt.setProperty(GeneratorOptions.CREATE_NODE_LABELS, nodes.isLabels());
    ports(nodes, genOpt, r);
    size(nodes, genOpt);
    genOpt.setProperty(GeneratorOptions.ISOLATED_NODES, !nodes.isRemoveIsolated());
  }
}

/**
 * Knows how to turn a {@link Configuration} object into a {@link GeneratorOptions} object. The
 * Xtend class has only static methods, so the helpers are module functions in Xtend order and
 * `parse` is its single public member (the `ElkUtil` const-object pattern).
 *
 * Deviations: the unused `Random` parameters of `hierarchy`, `edges` and `size` are dropped;
 * `setFlowSide` uses side tables instead of nested switches (complexity limit), with the same
 * effect. Xtend `exists` is a `null` test, so the TypeScript `null` checks stand for it.
 *
 * @see org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/generators/ConfigurationParser.xtend
 */
export const ConfigurationParser = {
  parse(config: Configuration, r: Random): GeneratorOptions {
    const genOpt = new GeneratorOptions();

    setGraphType(config, genOpt);
    nodes(config.getNodes(), r, genOpt);
    edges(config, genOpt);
    hierarchy(config, genOpt);

    setQuantities(genOpt, config.getFraction(), GeneratorOptions.PARTITION_FRAC);
    setIfExists(genOpt, config.getMaxWidth(), GeneratorOptions.MAX_WIDTH);
    setIfExists(genOpt, config.getMaxDegree(), GeneratorOptions.MAX_DEGREE);

    return genOpt;
  },
} as const;
