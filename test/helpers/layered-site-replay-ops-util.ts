// SPDX-License-Identifier: EPL-2.0
// Ops of the layered site replay, part 2 (tools/vectors/LayeredSiteVectors.java: registerUtilOps,
// registerSpacingOps, registerTarjanOps, registerAdapterOps): LGraphUtil, Spacings, NodeFlexibility, LayeredSpacings,
// Tarjan and LGraphAdapters.
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraphAdapters, LNodeAdapter, LPortAdapter } from '../../src/alg/layered/graph/LGraphAdapters.js';
import { LGraphUtil } from '../../src/alg/layered/graph/LGraphUtil.js';
import { LGraphElement } from '../../src/alg/layered/graph/LGraphElement.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { Tarjan } from '../../src/alg/layered/graph/Tarjan.js';
import { LayeredSpacings } from '../../src/alg/layered/options/LayeredSpacings.js';
import { NodeFlexibility } from '../../src/alg/layered/options/NodeFlexibility.js';
import { Spacings } from '../../src/alg/layered/options/Spacings.js';
import type { KVector } from '../../src/core/math/KVector.js';
import type { IPropertyHolder } from '../../src/graph/properties/IPropertyHolder.js';
import { Args, type Op } from './layered-site-replay-args.js';
import { Dbl, Handle, Raw, ReplayBug, dyn } from './layered-site-replay-context.js';

function vec(a: Args, i: number): KVector {
  return a.vec(i) as KVector;
}

export const UTIL_OPS: Readonly<Record<string, Op>> = {
  // LGraphUtil.resizeNode(LNode, KVector, boolean, boolean)
  'LGraphUtil.resizeNode': (a) => {
    LGraphUtil.resizeNode(a.n(0), vec(a, 1), a.b(2), a.b(3));
    return null;
  },
  // LGraphUtil.offsetGraph(LGraph, double, double)
  'LGraphUtil.offsetGraph': (a) => {
    LGraphUtil.offsetGraph(a.g(0), a.d(1), a.d(2));
    return null;
  },
  // LGraphUtil.offsetGraphs(Collection<LGraph>, double, double)
  'LGraphUtil.offsetGraphs': (a) => {
    const graphs = a.list(0).map((x) => a.cast(LGraph, a.c.get(x as string), 'graph list item'));
    LGraphUtil.offsetGraphs(graphs, a.d(1), a.d(2));
    return null;
  },
  // LGraphUtil.placeNodesHorizontally(Layer, double)
  'LGraphUtil.placeNodesHorizontally': (a) => {
    LGraphUtil.placeNodesHorizontally(a.y(0), a.d(1));
    return null;
  },
  // LGraphUtil.findMaxNonDummyNodeWidth(Layer, boolean) (double)
  'LGraphUtil.findMaxNonDummyNodeWidth': (a) => new Dbl(LGraphUtil.findMaxNonDummyNodeWidth(a.y(0), a.b(1))),
  // LGraphUtil.computeGraphProperties(LGraph)
  'LGraphUtil.computeGraphProperties': (a) => {
    LGraphUtil.computeGraphProperties(a.g(0));
    return null;
  },
  // LGraphUtil.createPort(LNode, KVector|null, PortType, LGraph) <h>
  'LGraphUtil.createPort': (a) => new Handle(LGraphUtil.createPort(a.n(0), a.vec(1), a.type(2)!, a.g(3))),
  // LGraphUtil.provideCollectorPort(LGraph, LNode, PortType, PortSide) <h> (null for PortType.UNDEFINED)
  'LGraphUtil.provideCollectorPort': (a) =>
    new Handle(LGraphUtil.provideCollectorPort(a.g(0), a.n(1), a.type(2)!, a.side(3)!)),
  // LGraphUtil.initializePort(LPort, PortConstraints, Direction, KVector|null)
  'LGraphUtil.initializePort': (a) => {
    LGraphUtil.initializePort(a.p(0), a.constraints(1), a.direction(2), a.vec(3));
    return null;
  },
  // LGraphUtil.createExternalPortDummy(IPropertyHolder, PortConstraints, PortSide, int, KVector, KVector, KVector,
  //   Direction, LGraph) <h>
  'LGraphUtil.createExternalPortDummy': (a) =>
    new Handle(
      LGraphUtil.createExternalPortDummy({
        propertyHolder: a.c.get(a.s(0)) as IPropertyHolder,
        portConstraints: a.constraints(1),
        portSide: a.side(2)!,
        netFlow: a.i(3),
        portNodeSize: vec(a, 4),
        portPosition: vec(a, 5),
        portSize: vec(a, 6),
        layoutDirection: a.direction(7),
        layeredGraph: a.g(8),
      }),
    ),
  // LGraphUtil.getExternalPortPosition(LGraph, LNode, double, double)
  'LGraphUtil.getExternalPortPosition': (a) => LGraphUtil.getExternalPortPosition(a.g(0), a.n(1), a.d(2), a.d(3)),
  // LGraphUtil.isDescendant(LNode, LNode)
  'LGraphUtil.isDescendant': (a) => LGraphUtil.isDescendant(a.n(0), a.n(1)),
  // LGraphUtil.changeCoordSystem(KVector, LGraph, LGraph) (returns the moved point)
  'LGraphUtil.changeCoordSystem': (a) => {
    const point = vec(a, 0);
    LGraphUtil.changeCoordSystem(point, a.g(1), a.g(2));
    return point;
  },
  // LGraphUtil.getIndividualOrInherited(LNode, IProperty) (C4)
  'LGraphUtil.getIndividualOrInherited': (a) =>
    new Raw(a.c.encode(LGraphUtil.getIndividualOrInherited(a.n(0), a.prop(1)), 0)),
  // LGraphUtil.getDirection(LGraph)
  'LGraphUtil.getDirection': (a) => LGraphUtil.getDirection(a.g(0)),
  // LGraphUtil.getMinimalModelOrder(LGraph)
  'LGraphUtil.getMinimalModelOrder': (a) => LGraphUtil.getMinimalModelOrder(a.g(0)),
};

function spacings(a: Args): Spacings {
  return a.onAs(Spacings);
}

export const SPACING_OPS: Readonly<Record<string, Op>> = {
  // new Spacings(LGraph) <h>
  newSpacings: (a) => new Handle(new Spacings(a.g(0))),
  // getHorizontalSpacing(LNode, LNode) (double)
  getHorizontalSpacingNodes: (a) => new Dbl(spacings(a).getHorizontalSpacing(a.n(0), a.n(1))),
  // getHorizontalSpacing(NodeType, NodeType) (double)
  getHorizontalSpacingTypes: (a) => new Dbl(spacings(a).getHorizontalSpacing(a.nodeType(0), a.nodeType(1))),
  // getHorizontalSpacing(LGraphElement, LGraphElement) (double)
  getHorizontalSpacingElements: (a) =>
    new Dbl(spacings(a).getHorizontalSpacing(a.ref(0, LGraphElement)!, a.ref(1, LGraphElement)!)),
  // getVerticalSpacing(LNode, LNode) (double)
  getVerticalSpacingNodes: (a) => new Dbl(spacings(a).getVerticalSpacing(a.n(0), a.n(1))),
  // getVerticalSpacing(NodeType, NodeType) (double)
  getVerticalSpacingTypes: (a) => new Dbl(spacings(a).getVerticalSpacing(a.nodeType(0), a.nodeType(1))),
  // Spacings.getIndividualOrDefault(LNode, IProperty) (C4)
  'Spacings.getIndividualOrDefault': (a) => new Raw(a.c.encode(Spacings.getIndividualOrDefault(a.n(0), a.prop(1)), 0)),
  // NodeFlexibility.getNodeFlexibility(LNode) (an enum name)
  'NodeFlexibility.getNodeFlexibility': (a) => NodeFlexibility.getNodeFlexibility(a.n(0)),
  // LayeredSpacings.OPTION_TARGET_FILTER.apply(IPropertyHolder, IProperty) (boolean)
  optionTargetFilter: (a) => LayeredSpacings.OPTION_TARGET_FILTER(a.onObject() as IPropertyHolder, a.prop(0)),
};

/** A Tarjan with the lists it fills, as SCCModelOrderCycleBreaker constructs it. */
class TarjanBox {
  constructor(
    readonly tarjan: Tarjan,
    readonly components: Set<LNode>[],
    readonly componentIds: Map<LNode, number>,
  ) {}
}

const DIGIT = /[0-9]/;

function digitRunEnd(s: string, from: number): number {
  let end = from;
  while (end < s.length && DIGIT.test(s.charAt(end))) {
    end++;
  }
  return end;
}

/** Names compared with digit runs numerically (`LayeredSiteVectors.byName`). */
export function byName(x: string, y: string): number {
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (DIGIT.test(x.charAt(i)) && DIGIT.test(y.charAt(j))) {
      const ei = digitRunEnd(x, i);
      const ej = digitRunEnd(y, j);
      const cmp = Math.sign(Number(x.substring(i, ei)) - Number(y.substring(j, ej)));
      if (cmp !== 0) {
        return cmp;
      }
      i = ei;
      j = ej;
    } else {
      if (x.charAt(i) !== y.charAt(j)) {
        return Math.sign(x.charCodeAt(i) - y.charCodeAt(j));
      }
      i++;
      j++;
    }
  }
  return Math.sign(x.length - i - (y.length - j));
}

function box(a: Args): TarjanBox {
  return a.onAs(TarjanBox);
}

export const TARJAN_OPS: Readonly<Record<string, Op>> = {
  // new Tarjan(List<LEdge>, List<Set<LNode>>, HashMap<LNode, Integer>) with fresh lists <h>
  newTarjan: (a) => {
    const toReverse: LEdge[] = a.edges(0);
    const components: Set<LNode>[] = [];
    const ids = new Map<LNode, number>();
    return new Handle(new TarjanBox(new Tarjan(toReverse, components, ids), components, ids));
  },
  // resetTarjan(LGraph)
  resetTarjan: (a) => {
    box(a).tarjan.resetTarjan(a.g(0));
    return null;
  },
  // tarjan(LGraph)
  tarjan: (a) => {
    box(a).tarjan.tarjan(a.g(0));
    return null;
  },
  // stronglyConnected(LNode)
  stronglyConnected: (a) => {
    box(a).tarjan.stronglyConnected(a.n(0));
    return null;
  },
  // the filled list of components in discovery order; the members of a component sorted by name
  tarjanComponents: (a) => new Raw(box(a).components.map((scc) => [...scc].map((n) => a.c.pathOf(n)).sort(byName))),
  // the node -> component index map as { name: index } sorted by name
  tarjanComponentIds: (a) => {
    const entries = [...box(a).componentIds].map(([n, id]) => [a.c.pathOf(n), id] as const);
    entries.sort(([x], [y]) => byName(x, y));
    return new Raw(Object.fromEntries(entries));
  },
};

function nodeFilter(name: string): (n: LNode) => boolean {
  switch (name) {
    case 'all':
      return () => true;
    case 'normal':
      return (n) => n.getType() === NodeType.NORMAL;
    case 'none':
      return () => false;
    default:
      throw new ReplayBug(`unknown node filter ${name}`);
  }
}

function listItem(items: Iterable<unknown>, index: number): unknown {
  let i = 0;
  for (const x of items) {
    if (i++ === index) {
      return x;
    }
  }
  throw new ReplayBug(`no item ${String(index)}`);
}

function adapterItems(adapter: unknown, what: string): Iterable<unknown> {
  switch (what) {
    case 'nodes':
      return dyn(adapter).getNodes!() as Iterable<unknown>;
    case 'ports':
      return dyn(adapter).getPorts!() as Iterable<unknown>;
    case 'labels':
    case 'edgeLabels':
      return dyn(adapter).getLabels!() as Iterable<unknown>;
    case 'incoming':
      return dyn(adapter).getIncomingEdges!() as Iterable<unknown>;
    case 'outgoing':
      return dyn(adapter).getOutgoingEdges!() as Iterable<unknown>;
    default:
      throw new ReplayBug(`unknown adapter list ${what}`);
  }
}

export const ADAPTER_OPS: Readonly<Record<string, Op>> = {
  // LGraphAdapters.adapt(LGraph) <h>
  'LGraphAdapters.adaptGraph': (a) => new Handle(LGraphAdapters.adapt(a.g(0))),
  // LGraphAdapters.adapt(LGraph, boolean) <h>
  'LGraphAdapters.adaptGraphTransparent': (a) => new Handle(LGraphAdapters.adapt(a.g(0), a.b(1))),
  // LGraphAdapters.adapt(LGraph, boolean, boolean, Predicate) <h>
  'LGraphAdapters.adaptGraphFiltered': (a) =>
    new Handle(LGraphAdapters.adapt(a.g(0), a.b(1), a.b(2), nodeFilter(a.s(3)))),
  // LGraphAdapters.adapt(LNode, boolean) <h>
  'LGraphAdapters.adaptNode': (a) => new Handle(LGraphAdapters.adapt(a.n(0), a.b(1))),
  // LGraphAdapters.adapt(LLabel) <h>
  'LGraphAdapters.adaptLabel': (a) => new Handle(LGraphAdapters.adapt(a.l(0))),
  // the i-th adapter of getNodes / getPorts / getLabels / getIncomingEdges / getOutgoingEdges / edge getLabels <h>
  adapterAt: (a) => new Handle(listItem(adapterItems(a.onObject(), a.s(0)), a.i(1))),
  // the whole list
  adapterItems: (a) => adapterItems(a.onObject(), a.s(0)),
  // the adapted element (reflection on the field "element")
  adapterElement: (a) => (a.onObject() as { element: unknown }).element,
  // NodeAdapter.sortPortList()
  sortPortList: (a) => {
    a.onAs(LNodeAdapter).sortPortList();
    return null;
  },
  // NodeAdapter.isCompoundNode()
  isCompoundNode: (a) => a.onAs(LNodeAdapter).isCompoundNode(),
  // PortAdapter.hasCompoundConnections()
  hasCompoundConnections: (a) => a.onAs(LPortAdapter).hasCompoundConnections(),
  // LGraphAdapters.DEFAULT_PORTLIST_SORTER.compare(LPort, LPort)
  'LGraphAdapters.compare': (a) => LGraphAdapters.DEFAULT_PORTLIST_SORTER.compare(a.p(0), a.p(1)),
};
